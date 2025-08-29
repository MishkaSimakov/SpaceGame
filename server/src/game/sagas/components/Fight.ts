import * as assert from "node:assert";

import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {EventType, MainModuleType, Player, RunawayType, TimeRecordType} from "@common/Types";
import {
    activateProtector,
    changePlayerEnergy,
    chooseModuleToDamageByEventCardRequest,
    chooseProtectorRequest, chooseTargetRequest, chooseWeaponAndTargetRequest, deactivateProtectorIfActive, endFight,
    message,
    popCardsFromHand, shiftFightTurnToNextPlayer, tryToRunawayRequest,
    useEventCardToDealDamageRequest,
    useModuleSecondTimeRequest
} from "@common/Actions";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {put, select} from "../runner/Effects";
import {damageModule} from "./DamageModule";
import {dice} from "./Random";
import {addTimeRecord} from "./Time";
import {request} from "./Request";


function* getCombatants() {
    const state = yield* select();
    assert.ok(state.fight);

    const fight = state.fight;

    const attackerId = fight.isFirstPlayerTurn ? fight.first : fight.second;
    const victimId = fight.isFirstPlayerTurn ? fight.second : fight.first;

    return {
        attacker: StateGetters.playerById(state, attackerId)!,
        victim: StateGetters.playerById(state, victimId)!
    };
}

function* chooseProtectors(victim: Player) {
    const {position} = yield* request(
        chooseProtectorRequest(victim.id),
        'chooseProtectorResponse'
    );

    if (position) {
        const protector = SpaceshipGetters.getModuleByPosition(victim.spaceship, position)!;

        yield* put(activateProtector(victim.id, position));
        yield* put(changePlayerEnergy(victim.id, -protector.energyCost, "use protector"));

        yield* put(message(victim.id, `активирует ${protector.name} (-${protector.energyCost}⚡)`));
    }
}

function* tryDamageByEventCard() {
    const {attacker, victim} = yield* getCombatants();

    const damageLaterCardIndex = attacker.hand.findIndex(
        c => c.cardType === "event" && c.event.type === EventType.SaveCardAndThenDealDamage
    );

    if (damageLaterCardIndex === -1) {
        return;
    }

    if (victim.spaceship.modules.length === 1) {
        return;
    }

    const {useEventCard} = yield* request(
        useEventCardToDealDamageRequest(attacker.id),
        'useEventCardToDealDamageResponse'
    );

    if (!useEventCard) {
        return;
    }

    const {position} = yield* request(
        chooseModuleToDamageByEventCardRequest(attacker.id, victim.id),
        'chooseModuleToDamageByEventCardResponse'
    );

    yield* put(popCardsFromHand(attacker.id, [damageLaterCardIndex], "use damage later event card"));

    yield* damageModule(victim, position, 1, {type: "EventCard"});

    const module = SpaceshipGetters.getModuleByPosition(victim.spaceship, position)!;
    yield* put(message(attacker.id, `атакует ${module.name}, используя карточку действия (-1❤)`));
}

function* askForRunawayViaDice() {
    const state = yield* select();
    const {attacker} = yield* getCombatants();

    const {willRunaway} = yield* request(
        tryToRunawayRequest(attacker.id, RunawayType.Dice),
        'tryToRunawayResponse'
    );

    if (!willRunaway) {
        return false;
    }

    const diceResult = yield* dice(attacker);

    if (diceResult >= state.settings.diceResultToRunaway) {
        yield* put(message(attacker.id, `пытался сбежать, выпало ${diceResult} => сбежал`));
        return true;
    } else {
        yield* put(message(attacker.id, `пытался сбежать, выпало ${diceResult} => не сбежал`));
        return false;
    }
}

function* askForRunawayViaMainModule() {
    const state = yield* select();
    const {attacker} = yield* getCombatants();

    if (attacker.energy < state.settings.mainModuleRunawayEnergyCost) {
        return false;
    }

    const {willRunaway} = yield* request(
        tryToRunawayRequest(attacker.id, RunawayType.MainModule),
        'tryToRunawayResponse'
    );

    if (!willRunaway) {
        return false;
    }

    yield* put(changePlayerEnergy(attacker.id, -state.settings.mainModuleRunawayEnergyCost, "used main module to run away"));
    yield* put(message(attacker.id, `сбежал, используя командный модуль (-${state.settings.mainModuleRunawayEnergyCost}⚡)`));

    return true;
}

function* damageByWeapon() {
    let {attacker, victim} = yield* getCombatants();

    if (PlayerGetters.canDamage(attacker)) {
        const {weaponPosition, targetPosition} = yield* request(
            chooseWeaponAndTargetRequest(attacker.id, victim.id),
            'chooseWeaponAndTargetResponse'
        );

        const weapon = SpaceshipGetters.getModuleByPosition(attacker.spaceship, weaponPosition)!;

        const target = SpaceshipGetters.getModuleByPosition(victim.spaceship, targetPosition)!;
        yield* put(message(attacker.id, `атаковал ${target.name} (-${weapon.energyCost}⚡ -${weapon.strength}❤️)`));

        yield* put(changePlayerEnergy(attacker.id, -weapon.energyCost, "used weapon in fight"));
        yield* damageModule(victim, targetPosition, weapon.strength, {type: "Player", attacker});

        // update state
        ({attacker, victim} = yield* getCombatants());

        if (SpaceshipGetters.getMainModuleType(attacker.spaceship) === MainModuleType.UseModuleSecondTime && attacker.energy >= weapon.energyCost * 2) {
            let {use} = yield* request(
                useModuleSecondTimeRequest(attacker.id, weapon.type),
                'useModuleSecondTimeResponse'
            );

            if (use) {
                const {position} = yield* request(
                    chooseTargetRequest(attacker.id, victim.id),
                    'chooseTargetResponse'
                );

                const target = SpaceshipGetters.getModuleByPosition(victim.spaceship, position)!;
                yield* put(message(attacker.id, `атаковал ${target.name}, используя оружие второй раз (-${weapon.energyCost * 2}⚡ -${weapon.strength}❤️)`));

                yield* put(changePlayerEnergy(attacker.id, -weapon.energyCost * 2, "used weapon in fight second time"));

                yield* damageModule(victim, position, weapon.strength, {type: "Player", attacker});
            }
        }
    }
}

function* makeFightIteration() {
    const {victim, attacker} = yield* getCombatants();

    if (PlayerGetters.canProtect(victim)) {
        yield* addTimeRecord(victim.id, TimeRecordType.FIGHT_TURN_STARTED);

        yield* chooseProtectors(victim);

        yield* addTimeRecord(victim.id, TimeRecordType.FIGHT_TURN_STARTED);
    }

    yield* addTimeRecord(attacker.id, TimeRecordType.FIGHT_TURN_STARTED);

    yield* tryDamageByEventCard();

    if (yield* askForRunawayViaDice()) {
        return false;
    }

    if (SpaceshipGetters.getMainModuleType(attacker.spaceship) === MainModuleType.AttackOrRunaway) {
        if (yield* askForRunawayViaMainModule()) {
            return false;
        }
    }

    yield* damageByWeapon();
    yield* put(deactivateProtectorIfActive(victim.id));
    yield* addTimeRecord(victim.id, TimeRecordType.FIGHT_TURN_ENDED);

    return true;
}

export function* fight() {
    try {
        yield* addTimeRecord(StateGetters.currentPlayer(yield* select()).id, TimeRecordType.DEFAULT_TURN_INTERRUPTED);

        while (true) {
            const {victim, attacker} = yield* getCombatants();

            if (!PlayerGetters.canDamage(victim) && !PlayerGetters.canDamage(attacker)) {
                yield* put(message(attacker.id, `никто не может атаковать => бой окончен`));
                break;
            }

            const continueFight = yield* makeFightIteration();
            if (!continueFight) {
                break;
            }

            yield* put(shiftFightTurnToNextPlayer());
        }

        // check that all protectors are disabled
        yield* addTimeRecord(StateGetters.currentPlayer(yield* select()).id, TimeRecordType.DEFAULT_TURN_CONTINUED);
    } finally {
        const {victim, attacker} = yield* getCombatants();

        yield* put(endFight());

        yield* put(deactivateProtectorIfActive(victim.id));
        yield* put(deactivateProtectorIfActive(attacker.id));
    }
}
