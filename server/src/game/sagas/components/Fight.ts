import {dice, put, select} from "../../Effects";
import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {
    activateProtector,
    changePlayerEnergy, deactivateProtectorIfActive,
    endFight,
    shiftFightTurnToNextPlayer
} from "@common/actions/Reducer";
import {EventTypes} from "@common/events/Event";
import {MainModuleType} from "@common/modules/MainModule";
import * as assert from "node:assert";
import Vector2 from "@common/Vector2";
import {isModule} from "@common/modules/Module";
import Player from "@common/Player";
import {request} from "./Request";
import {
    chooseProtectorRequest,
    chooseProtectorResponse,
    chooseTargetRequest,
    chooseTargetResponse,
    chooseWeaponAndTargetRequest,
    chooseWeaponAndTargetResponse,
    RunawayType,
    tryToRunawayRequest,
    tryToRunawayResponse, useModuleSecondTimeRequest, useModuleSecondTimeResponse,
} from "@common/actions/Main";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {damageModule} from "./DamageModule";

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

function* isVictimLost() {
    const {victim} = yield* getCombatants();
    return SpaceshipGetters.getMainModule(victim.spaceship) === undefined;
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

function* damageByEventCard() {
    // TODO
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
        let target = SpaceshipGetters.getModuleByPosition(victim.spaceship, targetPosition);

        assert.ok(attacker.energy >= weapon.energyCost);

        yield* damageModule(victim, attacker, target, weapon.strength, false);

        yield* put(changePlayerEnergy(attacker, -weapon.energyCost, "used weapon in fight"));

        // update state
        ({attacker, victim} = yield* getCombatants());

        if (yield* isVictimLost()) {
            yield* put(endFight());
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
                const target = SpaceshipGetters.getModuleByPosition(victim.spaceship, targetPosition);

                yield* damageModule(victim, attacker, target, weapon.strength, false);

                yield* put(changePlayerEnergy(attacker, -weapon.energyCost * 2, "used weapon in fight second time"));
            }
        }
    }
}

function* makeFightIteration() {
    const {victim, attacker} = yield* getCombatants();

    if (PlayerGetters.canProtect(victim)) {
        yield* chooseProtectors(victim);
    }

    let damageLaterCard: number = attacker.hand
        .findIndex((c) => {
            if (isModule(c)) return false;

            return c.type === EventTypes.SaveCardAndThenDealDamage;
        });

    if (damageLaterCard !== -1) {
        yield* damageByEventCard();
    }

    if (yield* askForRunawayViaDice()) {
        yield* put(endFight());
        return;
    }

    if (SpaceshipGetters.getMainModuleType(attacker.spaceship) === MainModuleType.AttackOrRunaway) {
        if (yield* askForRunawayViaMainModule()) {
            yield* put(endFight());
            return;
        }
    }

    yield* damageByWeapon();

    yield* put(deactivateProtectorIfActive(victim));

    if (yield* isVictimLost()) {
        yield* put(endFight());
        return;
    }
}

export function* fight() {
    while (true) {
        const {victim, attacker} = yield* getCombatants();

        if (!PlayerGetters.canDamage(victim) && !PlayerGetters.canDamage(attacker)) {
            yield* put(endFight());
            return;
        }

        yield* makeFightIteration();

        yield* put(shiftFightTurnToNextPlayer());
    }
}
