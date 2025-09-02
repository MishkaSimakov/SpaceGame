import {AttackReason, EventType, MainModuleType, MoveDamageReason} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {StateGetters} from "@common/getters/State";
import {
    beginFight,
    changePlayerEnergy,
    choosePlayerForAttackRequest, popCardsFromHand, pushCardsToDiscard,
} from "@common/Actions";

import {moveDamage} from "../components/MoveDamage";
import {request} from "../components/Request";
import {fight} from "../components/Fight";
import {put, select} from "../runner/Effects";

function* tryAttackByEventCard() {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    const attackLaterCardIndex = currentPlayer.hand
        .findIndex(card => {
            return card.cardType === "event" && card.event.type === EventType.SaveCardAndThenAttack;
        });

    if (attackLaterCardIndex !== -1) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer.id, AttackReason.AttackLaterEventCard, false),
            'choosePlayerForAttackResponse'
        );

        if (victim) {
            const attackLaterCard = currentPlayer.hand[attackLaterCardIndex];

            yield* put(popCardsFromHand(currentPlayer.id, [attackLaterCardIndex], "event card (attack later)"));
            yield* put(pushCardsToDiscard([attackLaterCard]));
            yield* put(beginFight(currentPlayer.id, victim, "event card (attack later)"));
            console.log("starting fight");
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
            choosePlayerForAttackRequest(currentPlayer.id, AttackReason.MainModule, false),
            'choosePlayerForAttackResponse'
        );

        if (victim) {
            yield* put(changePlayerEnergy(currentPlayer.id, -state.settings.energyToAttackByMainModule, "attack by main module"));
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
