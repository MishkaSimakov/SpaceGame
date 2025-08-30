import {
    AttackReason,
    Card,
    CardDestination,
    CardType,
    EventCard,
    EventType,
    GameState,
    ModuleType,
    MoveDamageReason
} from "@common/Types";
import {
    beginFight,
    changeModuleHealth,
    changePlayerEnergy,
    chooseCardsForRepairSpaceshipRequest,
    chooseCardsToDiscardAndTakeAnotherRequest,
    chooseCardToStealRequest,
    chooseModulesToRepairByDiscardedCardsRequest,
    chooseModuleToDamageByDiceRequest,
    chooseModuleToDestroyRequest,
    chooseModuleToRepairByDiceRequest,
    choosePlayerForAttackRequest,
    choosePlayerToStealCardRequest,
    chooseSolarPanelsToDestroyRequest,
    destructSpaceshipModules,
    permuteTopThreeEventCardsRequest,
    playerSkipNextTurn,
    popCardsFromHand,
    pushCardsToDiscard,
    pushCardsToHand,
    pushCardsToStack
} from "@common/Actions";
import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {put, select} from "../runner/Effects";
import {request} from "./Request";
import {fight} from "./Fight";
import {damageModule} from "./DamageModule";
import {popCards, popOneCard} from "./PopCards";
import {showCards} from "./ShowCards";
import {dice} from "./Random";
import {moveDamage} from "./MoveDamage";

function* putTopThreeCardsInAnyOrder(state: GameState) {
    const topThreeCards = yield* popCards(CardType.Event, 3);

    const {order} = yield* request(
        permuteTopThreeEventCardsRequest(
            StateGetters.currentPlayer(state).id,
            topThreeCards.map(card => card.event)
        ),
        'permuteTopThreeEventCardsResponse'
    );

    let newOrderedCards: Card[] = [];
    for (let i = 0; i < 3; ++i) {
        newOrderedCards.push(topThreeCards[order[i]]);
    }

    yield* put(pushCardsToStack(newOrderedCards.reverse()));
}

function* takeBuildingCards(state: GameState, count: number) {
    const player = StateGetters.currentPlayer(state);
    const cards = (yield* popCards(CardType.Module, count));

    yield* put(pushCardsToHand(player.id, cards));

    yield* showCards(player, cards, false);
}

let eventsPerformFunctions: Record<EventType, (state: GameState, event: EventCard) => Generator> = {
    [EventType.PutTopThreeCardsInAnyOrder]: putTopThreeCardsInAnyOrder,
    [EventType.PutTopThreeCardsInAnyOrderAndTakeTop]: function* (state: GameState, event: EventCard) {
        yield* putTopThreeCardsInAnyOrder(state);

        const topEvent = yield* popOneCard(CardType.Event);

        yield* put(pushCardsToDiscard([{cardType: "event", event}]));

        yield* performEvent(topEvent.event);
    },
    [EventType.TakeOneBuildingCard]: function* (state: GameState) {
        yield* takeBuildingCards(state, 1);
    },
    [EventType.TakeTwoBuildingCards]: function* (state: GameState) {
        yield* takeBuildingCards(state, 2);
    },
    [EventType.LooseFiveEnergy]: function* (state: GameState) {
        yield* put(changePlayerEnergy(StateGetters.currentPlayer(state).id, -1, "event card (loose 5 energy)"));
    },
    [EventType.TakeFiveEnergy]: function* (state: GameState) {
        yield* put(changePlayerEnergy(StateGetters.currentPlayer(state).id, 1, "event card (take 5 energy)"));
    },
    [EventType.SkipNextTurn]: function* (state: GameState) {
        yield* put(playerSkipNextTurn(StateGetters.currentPlayer(state).id));
    },
    [EventType.LooseAllYourCards]: function* (state: GameState) {
        const player = StateGetters.currentPlayer(state);

        yield* put(popCardsFromHand(
            player.id,
            [...Array(player.hand.length).keys()],
            "event card (loose all your cards)"
        ));
    },
    [EventType.DestroyAnyModuleOnYourSpaceship]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        if (currentPlayer.spaceship.modules.length === 1) {
            return;
        }

        const {position} = yield* request(
            chooseModuleToDestroyRequest(currentPlayer.id),
            'chooseModuleToDestroyResponse'
        );

        yield* put(destructSpaceshipModules(currentPlayer.id, [position], CardDestination.discard, CardDestination.hand));
    },
    [EventType.DestroyTwoSolarPanelsOnYourSpaceship]: function* (state: GameState) {
        const player = StateGetters.currentPlayer(state);

        const solarPanelsCount = SpaceshipGetters.getModulesByType(player.spaceship, ModuleType.SolarPanel).length;
        if (solarPanelsCount === 0) {
            return;
        }

        const {positions} = yield* request(
            chooseSolarPanelsToDestroyRequest(player.id, Math.min(2, solarPanelsCount)),
            'chooseSolarPanelsToDestroyResponse'
        );

        yield* put(destructSpaceshipModules(player.id, positions, CardDestination.discard, CardDestination.hand));
    },
    [EventType.AttackRight]: function* (state: GameState) {
        const victim = StateGetters.getPlayerIndexByOffset(state, 1);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, state.players[victim].id, "event card (attack right)"));
        yield* fight();
    },
    [EventType.AttackLeft]: function* (state: GameState) {
        const victim = StateGetters.getPlayerIndexByOffset(state, -1);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, state.players[victim].id, "event card (attack left)"));
        yield* fight();
    },
    [EventType.AttackNextToRight]: function* (state: GameState) {
        const offset = state.players.length > 2 ? 2 : 1;
        const victim = StateGetters.getPlayerIndexByOffset(state, offset);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, state.players[victim].id, "event card (attack next to right)"));
        yield* fight();
    },
    [EventType.AttackNextToLeft]: function* (state: GameState) {
        const offset = state.players.length > 2 ? -2 : -1;
        const victim = StateGetters.getPlayerIndexByOffset(state, offset);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, state.players[victim].id, "event card (attack next to left)"));
        yield* fight();
    },
    [EventType.AttackAny]: function* (state: GameState) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(StateGetters.currentPlayer(state).id, AttackReason.AttackAnyEventCard, true),
            'choosePlayerForAttackResponse'
        );

        yield* put(beginFight(StateGetters.currentPlayer(state).id, victim!, "event card (attack any)"));
        yield* fight();
    },
    [EventType.TossDiceAndTakeBuildingCards]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        const cardsCount = (yield* dice(currentPlayer)) <= 4 ? 1 : 2;

        const cards = yield* popCards(CardType.Module, cardsCount);
        yield* put(pushCardsToHand(currentPlayer.id, cards));

        yield* showCards(currentPlayer, cards, false);
    },
    [EventType.TossDiceAndDealDamage]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        const damage = (yield* dice(currentPlayer)) <= 4 ? 1 : 2;

        const {info} = yield* request(
            chooseModuleToDamageByDiceRequest(currentPlayer.id, damage),
            'chooseModuleToDamageByDiceResponse'
        );

        if (!info) {
            return;
        }

        const victim = StateGetters.playerById(state, info.victimId)!;
        yield* damageModule(victim, info.victimModulePosition, damage, {type: "EventCard"});
    },
    [EventType.TossDiceAndGetEnergy]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        const energyCount = (yield* dice(currentPlayer)) <= 4 ? 1 : 2;

        yield* put(changePlayerEnergy(currentPlayer.id, energyCount, "event card (toss dice & get energy)"));
    },
    [EventType.TossDiceAndRepairYourModule]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);

        if (!SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
            return;
        }

        const repairAmount = (yield* dice(currentPlayer)) <= 4 ? 1 : 2;

        const {position} = yield* request(
            chooseModuleToRepairByDiceRequest(currentPlayer.id, repairAmount),
            'chooseModuleToRepairByDiceResponse'
        );

        if (!position) {
            return;
        }

        yield* put(changeModuleHealth(currentPlayer.id, position, repairAmount, "event card (toss dice & repair)"));
    },
    [EventType.SaveCardAndThenAttack]: function* (state: GameState, event: EventCard) {
        yield* put(pushCardsToHand(StateGetters.currentPlayer(state).id, [{cardType: "event", event}]));
    },
    [EventType.SaveCardAndThenDealDamage]: function* (state: GameState, event: EventCard) {
        yield* put(pushCardsToHand(StateGetters.currentPlayer(state).id, [{cardType: "event", event}]));
    },
    [EventType.ChoosePlayerAndStealHisCard]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        const playersWithCards = state.players.filter(p => (p.hand.length !== 0) && (p.id !== currentPlayer.id));

        if (playersWithCards.length === 0) return;

        const {target} = yield* request(
            choosePlayerToStealCardRequest(currentPlayer.id, playersWithCards.map(p => p.id)),
            'choosePlayerToStealCardResponse'
        );

        const chosenPlayer = StateGetters.playerById(state, target)!;

        const {chosenCardIndex} = yield* request(
            chooseCardToStealRequest(currentPlayer.id, chosenPlayer.hand),
            'chooseCardToStealResponse'
        );

        const chosenCard = chosenPlayer.hand[chosenCardIndex];
        yield* put(popCardsFromHand(chosenPlayer.id, [chosenCardIndex], "event card (choose player & steal his card)"));
        yield* put(pushCardsToHand(currentPlayer.id, [chosenCard]));
    },
    [EventType.DiscardCardAndRepairSpaceship]: function* (state: GameState) {
        // TODO: choose 1 or 2 cards
        // Вы можете, скинув до 2 карт с руки, восстановить по 1 урона с модулей вашего корабля за каждую скинутую карту

        const currentPlayer = StateGetters.currentPlayer(state);

        if (currentPlayer.hand.length === 0 || !SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
            return;
        }

        const {indexes} = yield* request(
            chooseCardsForRepairSpaceshipRequest(currentPlayer.id),
            'chooseCardsForRepairSpaceshipResponse'
        );

        if (indexes.length === 0) {
            return;
        }

        const cards = currentPlayer.hand.filter((card, index) => indexes.includes(index));

        yield* put(popCardsFromHand(currentPlayer.id, indexes, "event card (discard & repair)"));
        yield* put(pushCardsToDiscard(cards));

        const {positions} = yield* request(
            chooseModulesToRepairByDiscardedCardsRequest(currentPlayer.id, indexes.length),
            'chooseModulesToRepairByDiscardedCardsResponse'
        );

        for (let modulePosition of positions) {
            yield* put(changeModuleHealth(currentPlayer.id, modulePosition, 2, "event card (discard & repair)"));
        }
    },
    [EventType.MoveDamage]: function* () {
        yield* moveDamage(MoveDamageReason.EventCard, 0, 1);
    },
    [EventType.DiscardCardsAndTakeBuildingCards]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        if (currentPlayer.hand.length == 0) {
            return;
        }

        const {indexes} = yield* request(
            chooseCardsToDiscardAndTakeAnotherRequest(currentPlayer.id),
            'chooseCardsToDiscardAndTakeAnotherResponse'
        );

        if (indexes.length === 0) {
            return;
        }

        const discardedCards = currentPlayer.hand.filter((_, index) => indexes.includes(index));

        yield* put(popCardsFromHand(currentPlayer.id, indexes, "event card (discard & take modules)"));
        yield* put(pushCardsToDiscard(discardedCards));

        const cards = yield* popCards(CardType.Module, indexes.length);
        yield* put(pushCardsToHand(currentPlayer.id, cards));

        yield* showCards(currentPlayer, cards, false);
    }
};

export function* performEvent(event: EventCard) {
    const state = yield* select();
    yield* eventsPerformFunctions[event.type](state, event);
}