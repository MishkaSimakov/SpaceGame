import {isModule} from "@common/modules/Module";
import {EventTypes} from "@common/events/Event";
import Actions from "@common/actions/Main";

import {fight} from "../components/Fight";
import {put, select} from "../Effects";
import {AttackReason, MoveDamageReason} from "@common/Types";
import {request} from "../components/Request";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {MainModuleType} from "@common/modules/MainModule";
import {moveDamage} from "../components/MoveDamage";
import {StateGetters} from "@common/getters/State";

const {
    beginFight,
    changePlayerEnergy,
    choosePlayerForAttackRequest,
    disposeCardsFromPlayerHand,
} = Actions;

function* tryAttackByEventCard() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const attackLaterCardIndex = currentPlayer.hand
        .findIndex((c) => {
            if (isModule(c)) return false;

            return c.type === EventTypes.SaveCardAndThenAttack;
        });

    if (attackLaterCardIndex !== -1) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer, AttackReason.AttackLaterEventCard, false),
            'choosePlayerForAttackResponse'
        );

        if (victim) {
            yield* put(disposeCardsFromPlayerHand(currentPlayer, [attackLaterCardIndex], "event card (attack later)"));
            yield* put(beginFight(currentPlayer.id, victim, "event card (attack later)"));
            yield* fight();
        }
    }
}

function* tryAttackByMainModule() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.AttackOrRunaway
        && currentPlayer.energy >= state.settings.energyToAttackByMainModule) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer, AttackReason.MainModule, false),
            'choosePlayerForAttackResponse'
        );

        if (victim) {
            yield* put(changePlayerEnergy(currentPlayer, -state.settings.energyToAttackByMainModule, "attack by main module"));
            yield* put(beginFight(currentPlayer.id, victim, "attack by main module"));
            yield* fight();
        }
    }
}

function* tryMoveDamageByMainModule() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.MoveDamage
        && currentPlayer.energy >= state.settings.energyToMoveDamageByMainModule
        && SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
        yield* moveDamage(
            MoveDamageReason.MainModule,
            state.settings.energyToMoveDamageByMainModule,
            state.settings.damageMovedByMainModule
        );
    }
}

export function* beforeTurn() {
    yield* tryAttackByEventCard();
    yield* tryAttackByMainModule();
    yield* tryMoveDamageByMainModule();
}
