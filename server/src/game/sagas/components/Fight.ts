import {put, select} from "../../Effects";
import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {
    activateProtector,
    changePlayerEnergy, deactivateProtectorIfActive,
    endFight, popCardFromPlayerHand,
    shiftFightTurnToNextPlayer
} from "@common/actions/Reducer";
import {EventTypes, isEvent} from "@common/events/Event";
import {MainModuleType} from "@common/modules/MainModule";
import * as assert from "node:assert";
import Vector2 from "@common/Vector2";
import Player from "@common/Player";
import {request} from "./Request";
import {
    chooseModuleToDamageByEventCardRequest, chooseModuleToDamageByEventCardResponse,
    chooseProtectorRequest,
    chooseProtectorResponse,
    chooseTargetRequest,
    chooseTargetResponse,
    chooseWeaponAndTargetRequest,
    chooseWeaponAndTargetResponse,
    RunawayType,
    tryToRunawayRequest,
    tryToRunawayResponse,
    useEventCardToDealDamageRequest,
    useEventCardToDealDamageResponse,
    useModuleSecondTimeRequest,
    useModuleSecondTimeResponse,
} from "@common/actions/Main";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {damageModule} from "./DamageModule";
import {dice} from "./Random";

function* getCombatants() {
    const state = yield* select();
    const fight = state.fight;

    assert.ok(fight !== undefined);

    const attackerId = fight.isFirstPlayerTurn ? fight.first : fight.second;
    const victimId = fight.isFirstPlayerTurn ? fight.second : fight.first;

    return {
        attacker: StateGetters.playerById(state, attackerId),
        victim: StateGetters.playerById(state, victimId)
    };
}

function* isFightEnded() {
    return (yield* select()).fight === undefined;
}

function* isVictimLost() {
    return (yield* getCombatants()).victim.lose;
}

function* chooseProtectors(victim: Player) {
    const protectorPosition: Vector2 | undefined = yield* request(
        chooseProtectorRequest(victim),
        chooseProtectorResponse
    );

    if (protectorPosition) {
        const protector = SpaceshipGetters.getModuleByPosition(victim.spaceship, protectorPosition);

        yield* put(activateProtector(victim, protectorPosition));
        yield* put(changePlayerEnergy(victim, -protector.energyCost, "use protector"));
    }
}

function* tryDamageByEventCard() {
    const {attacker, victim} = yield* getCombatants();

    const damageLaterCardIndex = attacker.hand.findIndex(
        c => isEvent(c) && c.type === EventTypes.SaveCardAndThenDealDamage
    );

    if (damageLaterCardIndex === -1) {
        return;
    }

    if (victim.spaceship.modules.length === 1) {
        return;
    }

    const willUse = yield* request(
        useEventCardToDealDamageRequest(attacker),
        useEventCardToDealDamageResponse
    );

    if (!willUse) {
        return;
    }

    const position = yield* request(
        chooseModuleToDamageByEventCardRequest(attacker, victim),
        chooseModuleToDamageByEventCardResponse
    );

    yield* put(popCardFromPlayerHand(attacker, damageLaterCardIndex));

    yield* damageModule(victim, position, 1, {type: "EventCard"});

    if (yield* isVictimLost()) {
        yield* put(endFight());
        return;
    }
}

function* askForRunawayViaDice() {
    const state = yield* select();
    const {attacker} = yield* getCombatants();

    const isTryingToRunaway = yield* request(
        tryToRunawayRequest(attacker, RunawayType.DICE),
        tryToRunawayResponse
    );

    if (!isTryingToRunaway) {
        return false;
    }

    return (yield* dice()) >= state.settings.diceResultToRunaway;
}

function* askForRunawayViaMainModule() {
    const state = yield* select();
    const {attacker} = yield* getCombatants();

    if (attacker.energy < state.settings.mainModuleRunawayEnergyCost) {
        return false;
    }

    const isTryingToRunaway = yield* request(
        tryToRunawayRequest(attacker, RunawayType.MAIN_MODULE),
        tryToRunawayResponse
    );

    if (!isTryingToRunaway) {
        return false;
    }

    yield* put(changePlayerEnergy(attacker, -state.settings.mainModuleRunawayEnergyCost, "used main module to run away"));

    return true;
}

function* damageByWeapon() {
    let {attacker, victim} = yield* getCombatants();

    if (PlayerGetters.canDamage(attacker)) {
        const {weaponPosition, targetPosition} = yield* request(
            chooseWeaponAndTargetRequest(attacker, victim),
            chooseWeaponAndTargetResponse
        );

        let weapon = SpaceshipGetters.getModuleByPosition(attacker.spaceship, weaponPosition);

        assert.ok(attacker.energy >= weapon.energyCost);

        yield* damageModule(victim, targetPosition, weapon.strength, {type: "Player", attacker});

        yield* put(changePlayerEnergy(attacker, -weapon.energyCost, "used weapon in fight"));

        // update state
        ({attacker, victim} = yield* getCombatants());

        if (yield* isVictimLost()) {
            return;
        }

        if (SpaceshipGetters.getMainModuleType(attacker.spaceship) === MainModuleType.UseModuleSecondTime && attacker.energy >= weapon.energyCost * 2) {
            let useSecondTime = yield* request(
                useModuleSecondTimeRequest(attacker, weapon.type),
                useModuleSecondTimeResponse
            );

            if (useSecondTime) {
                const targetPosition = yield* request(
                    chooseTargetRequest(attacker, victim),
                    chooseTargetResponse
                );

                yield* damageModule(victim, targetPosition, weapon.strength, {type: "Player", attacker});

                yield* put(changePlayerEnergy(attacker, -weapon.energyCost * 2, "used weapon in fight second time"));

                if (yield* isVictimLost()) {
                    return;
                }
            }
        }
    }
}

function* makeFightIteration() {
    const {victim, attacker} = yield* getCombatants();

    if (PlayerGetters.canProtect(victim)) {
        yield* chooseProtectors(victim);
    }

    yield* tryDamageByEventCard();
    if (yield* isVictimLost()) {
        return false;
    }

    if (yield* askForRunawayViaDice()) {
        yield* put(endFight());
        return false;
    }

    if (SpaceshipGetters.getMainModuleType(attacker.spaceship) === MainModuleType.AttackOrRunaway) {
        if (yield* askForRunawayViaMainModule()) {
            yield* put(endFight());
            return false;
        }
    }

    yield* damageByWeapon();
    if (yield* isVictimLost()) {
        yield* put(endFight());
        return false;
    }

    yield* put(deactivateProtectorIfActive(victim));

    return true;
}

export function* fight() {
    while (true) {
        const {victim, attacker} = yield* getCombatants();

        if (!PlayerGetters.canDamage(victim) && !PlayerGetters.canDamage(attacker)) {
            yield* put(endFight());
            return;
        }

        const continueFight = yield* makeFightIteration();
        if (!continueFight) {
            break;
        }

        yield* put(shiftFightTurnToNextPlayer());
    }

    // check that all protectors are disabled
    const state = yield* select();
    assert.ok(!state.players.some(p => p.spaceship.activatedProtector));

    assert.ok(state.fight === undefined);
}
