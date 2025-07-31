import {isModule} from "@common/modules/Module";
import {EventTypes} from "@common/events/Event";

import {fight} from "../components/Fight";
import {put, select} from "../../Effects";
import {
    beginFight, changeModuleHealth,
    changePlayerEnergy,
    chooseModuleToMoveDamageRequest, chooseModuleToMoveDamageResponse,
    choosePlayerForAttackRequest,
    choosePlayerForAttackResponse,
    disposeCardsFromPlayerHand,
} from "@common/actions/Main";
import {AttackReason, MoveDamageReason} from "@common/Types";
import {request} from "../components/Request";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {MainModuleType} from "@common/modules/MainModule";
import {damageModule} from "../components/DamageModule";

function* tryAttackByEventCard() {
    const state = yield* select();
    const currentPlayer = state.players[state.currentPlayerIndex];

    let attackLaterCardIndex: number = currentPlayer.hand
        .findIndex((c) => {
            if (isModule(c)) return false;

            return c.type === EventTypes.SaveCardAndThenAttack;
        });

    if (attackLaterCardIndex !== -1) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer, AttackReason.AttackLaterEventCard),
            choosePlayerForAttackResponse
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
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.AttackOrRunaway
        && currentPlayer.energy >= state.settings.energyToAttackByMainModule) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer, AttackReason.MainModule),
            choosePlayerForAttackResponse
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
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.MoveDamage
        && currentPlayer.energy >= state.settings.energyToMoveDamageByMainModule
        && SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {

        const moveDamageData = yield* request(
            chooseModuleToMoveDamageRequest(currentPlayer, MoveDamageReason.MainModule),
            chooseModuleToMoveDamageResponse
        );

        if (moveDamageData) {
            const {from, to} = moveDamageData;

            yield* put(changePlayerEnergy(currentPlayer, -state.settings.energyToMoveDamageByMainModule, "move damage by main module"));

            yield* put(changeModuleHealth(currentPlayer, from, state.settings.damageMovedByMainModule, "move damage by main module"));
            yield* damageModule(
                currentPlayer,
                SpaceshipGetters.getModuleByPosition(currentPlayer.spaceship, to),
                state.settings.damageMovedByMainModule,
                {type: "EventCard"}
            );
        }
    }
}

export function* beforeTurn() {
    yield* tryAttackByEventCard();
    yield* tryAttackByMainModule();
    yield* tryMoveDamageByMainModule();
}
