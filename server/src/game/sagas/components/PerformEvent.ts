import {Event, EventTypes} from "@common/events/Event";
import GameState from "../../GameState";
import {
    beginFight,
    changeModuleHealth,
    changePlayerEnergy,
    chooseCardsForRepairSpaceshipRequest,
    chooseCardsForRepairSpaceshipResponse,
    chooseCardsToDiscardAndTakeAnotherRequest,
    chooseCardsToDiscardAndTakeAnotherResponse,
    chooseCardToStealRequest,
    chooseCardToStealResponse,
    chooseModulesToRepairByDiscardedCardsRequest,
    chooseModulesToRepairByDiscardedCardsResponse,
    chooseModuleToDamageByDiceRequest,
    chooseModuleToDamageByDiceResponse,
    chooseModuleToDestroyRequest,
    chooseModuleToDestroyResponse,
    chooseModuleToMoveDamageRequest,
    chooseModuleToMoveDamageResponse,
    chooseModuleToRepairByDiceRequest,
    chooseModuleToRepairByDiceResponse,
    choosePlayerForAttackRequest,
    choosePlayerForAttackResponse,
    choosePlayerToStealCardRequest,
    choosePlayerToStealCardResponse,
    chooseTwoSolarPanelsToDestroyRequest,
    chooseTwoSolarPanelsToDestroyResponse,
    destructSpaceshipModules,
    disposeCardsFromPlayerHand,
    permuteTopThreeEventCardsRequest,
    permuteTopThreeEventCardsResponse,
    playerSkipNextTurn,
    popCardFromPlayerHand,
    pushCardsToDiscard,
    pushCardsToHand,
    pushCardsToStack,
} from "@common/actions/Main";
import {StateGetters} from "@common/getters/State";
import {put, select} from "../../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import Module, {ModuleType} from "@common/modules/Module";
import {request} from "./Request";
import Vector2 from "@common/Vector2";
import {fight} from "./Fight";
import {AttackReason, MoveDamageReason} from "@common/Types";
import {damageModule} from "./DamageModule";
import {popCards, popOneCard} from "./PopCards";
import {showCards} from "./ShowCards";
import {dice} from "./Random";

function* putTopThreeCardsInAnyOrder(state: GameState) {
    const topThreeCards = yield* popCards("event", 3);

    const order = yield* request(
        permuteTopThreeEventCardsRequest(StateGetters.currentPlayer(state), topThreeCards),
        permuteTopThreeEventCardsResponse
    );

    let newOrderedCards: Event[] = [];
    for (let i = 0; i < 3; ++i) {
        newOrderedCards.push(topThreeCards[order[i]]);
    }

    yield* put(pushCardsToStack("event", newOrderedCards));
}

function* takeBuildingCards(state: GameState, count: number) {
    const player = StateGetters.currentPlayer(state);
    const cards = yield* popCards("module", count);

    yield* put(pushCardsToHand(player, cards));

    yield* showCards(player, cards, false);
}

let eventsPerformFunctions: Record<EventTypes, (state: GameState, event: Event) => Generator> = {
    [EventTypes.PutTopThreeCardsInAnyOrder]: putTopThreeCardsInAnyOrder,
    [EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop]: function* (state: GameState, event: Event) {
        yield* putTopThreeCardsInAnyOrder(state);

        const topEvent = yield* popOneCard("event");

        yield* put(pushCardsToDiscard("event", [event]));

        yield* performEvent(topEvent);
    },
    [EventTypes.TakeOneBuildingCard]: function* (state: GameState) {
        yield* takeBuildingCards(state, 1);
    },
    [EventTypes.TakeTwoBuildingCards]: function* (state: GameState) {
        yield* takeBuildingCards(state, 2);
    },
    [EventTypes.LooseFiveEnergy]: function* (state: GameState) {
        yield* put(changePlayerEnergy(StateGetters.currentPlayer(state), -1, "event card (loose 5 energy)"));
    },
    [EventTypes.TakeFiveEnergy]: function* (state: GameState) {
        yield* put(changePlayerEnergy(StateGetters.currentPlayer(state), 1, "event card (take 5 energy)"));
    },
    [EventTypes.SkipNextTurn]: function* (state: GameState) {
        yield* put(playerSkipNextTurn(StateGetters.currentPlayer(state).id));
    },
    [EventTypes.LooseAllYourCards]: function* (state: GameState) {
        const player = StateGetters.currentPlayer(state);

        yield* put(disposeCardsFromPlayerHand(
            player,
            [...Array(player.hand.length).keys()],
            "event card (loose all your cards)"
        ));
    },
    [EventTypes.DestroyAnyModuleOnYourSpaceship]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        if (currentPlayer.spaceship.modules.length === 1) {
            return;
        }

        const position = yield* request(
            chooseModuleToDestroyRequest(currentPlayer),
            chooseModuleToDestroyResponse
        );

        yield* put(destructSpaceshipModules(currentPlayer, [position], "discard", "hand"));
    },
    [EventTypes.DestroyTwoSolarPanelsOnYourSpaceship]: function* (state: GameState) {
        const player = StateGetters.currentPlayer(state);

        if (SpaceshipGetters.getModulesByType(player.spaceship, ModuleType.SolarPanel).length === 0) {
            return;
        }

        const positions: Vector2[] = yield* request(
            chooseTwoSolarPanelsToDestroyRequest(player),
            chooseTwoSolarPanelsToDestroyResponse
        );

        if (positions.length !== 1 && positions.length !== 2) {
            // TODO: retry request
            throw new Error("Wrong value");
        }

        const modules: Module[] = positions.map(pos => SpaceshipGetters.getModuleByPosition(player.spaceship, pos));
        if (modules.some(m => m.type !== ModuleType.SolarPanel)) {
            throw new Error("User have chosen wrong module type.");
        }

        yield* put(destructSpaceshipModules(player, positions, "discard", "hand"));
    },
    [EventTypes.AttackRight]: function* (state: GameState) {
        const victim = StateGetters.getPlayerIndexByOffset(state, 1);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, victim, "event card (attack right)"));
        yield* fight();
    },
    [EventTypes.AttackLeft]: function* (state: GameState) {
        const victim = StateGetters.getPlayerIndexByOffset(state, -1);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, victim, "event card (attack left)"));
        yield* fight();
    },
    [EventTypes.AttackNextToRight]: function* (state: GameState) {
        const offset = state.players.length > 2 ? 2 : 1;
        const victim = StateGetters.getPlayerIndexByOffset(state, offset);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, victim, "event card (attack next to right)"));
        yield* fight();
    },
    [EventTypes.AttackNextToLeft]: function* (state: GameState) {
        const offset = state.players.length > 2 ? -2 : -1;
        const victim = StateGetters.getPlayerIndexByOffset(state, offset);

        yield* put(beginFight(StateGetters.currentPlayer(state).id, victim, "event card (attack next to left)"));
        yield* fight();
    },
    [EventTypes.AttackAny]: function* (state: GameState) {
        const {victim} = yield* request(
            choosePlayerForAttackRequest(StateGetters.currentPlayer(state), AttackReason.AttackAnyEventCard),
            choosePlayerForAttackResponse
        );

        if (!victim) {
            throw new Error("Attacked player is undefined in choosing player for attack in AttackAny event card");
        }

        yield* put(beginFight(StateGetters.currentPlayer(state).id, victim, "event card (attack any)"));
        yield* fight();
    },
    [EventTypes.TossDiceAndTakeBuildingCards]: function* (state: GameState) {
        const cardsCount = (yield* dice()) <= 4 ? 1 : 2;

        const cards = yield* popCards("module", cardsCount);

        yield* showCards(StateGetters.currentPlayer(state), cards, false);
    },
    [EventTypes.TossDiceAndDealDamage]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        let damage = (yield* dice()) <= 4 ? 1 : 2;

        const {victimId, victimModulePosition} = yield* request(
            chooseModuleToDamageByDiceRequest(currentPlayer, damage),
            chooseModuleToDamageByDiceResponse
        );

        if (victimId === undefined) return;

        let victim = StateGetters.playerById(state, victimId);
        let victimModule = SpaceshipGetters.getModuleByPosition(victim.spaceship, victimModulePosition);

        yield* damageModule(victim, currentPlayer, victimModule, damage, true);
    },
    [EventTypes.TossDiceAndGetEnergy]: function* (state: GameState) {
        const energyCount = (yield* dice()) <= 4 ? 1 : 2;

        yield* put(changePlayerEnergy(StateGetters.currentPlayer(state), energyCount, "event card (toss dice & get energy)"));
    },
    [EventTypes.TossDiceAndRepairYourModule]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);

        if (!SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
            return;
        }

        const diceResult = yield* dice();

        const moduleToRepairPosition = yield* request(
            chooseModuleToRepairByDiceRequest(currentPlayer, diceResult),
            chooseModuleToRepairByDiceResponse
        );

        if (moduleToRepairPosition === undefined) {
            return;
        }

        yield* put(changeModuleHealth(currentPlayer, moduleToRepairPosition, diceResult, "event card (toss dice & repair)"));
    },
    [EventTypes.SaveCardAndThenAttack]: function* (state: GameState, event: Event) {
        yield* put(pushCardsToHand(StateGetters.currentPlayer(state), [event]));
    },
    [EventTypes.SaveCardAndThenDealDamage]: function* (state: GameState, event: Event) {
        yield* put(pushCardsToHand(StateGetters.currentPlayer(state), [event]));
    },
    [EventTypes.ChoosePlayerAndStealHisCard]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        let playersWithCards = state.players.filter(p => (p.hand.length !== 0) && (p.id !== currentPlayer.id));

        if (playersWithCards.length === 0) return;

        const chosenPlayerId = yield* request(
            choosePlayerToStealCardRequest(currentPlayer, playersWithCards.map(p => p.id)),
            choosePlayerToStealCardResponse
        );

        const chosenPlayer = StateGetters.playerById(state, chosenPlayerId);

        const chosenCardIndex = yield* request(
            chooseCardToStealRequest(currentPlayer, chosenPlayer.hand),
            chooseCardToStealResponse
        );

        const chosenCard = chosenPlayer.hand[chosenCardIndex];
        yield* put(popCardFromPlayerHand(chosenPlayer, chosenCardIndex));
        yield* put(pushCardsToHand(currentPlayer, [chosenCard]));
    },
    [EventTypes.DiscardCardAndRepairSpaceship]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);

        if (currentPlayer.hand.length === 0 || !SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
            return;
        }

        const discardedCardsIndexes = yield* request(
            chooseCardsForRepairSpaceshipRequest(currentPlayer),
            chooseCardsForRepairSpaceshipResponse
        );

        if (discardedCardsIndexes.length > 2)
            throw new Error('Too many discarded cards in DiscardCardAndRepairSpaceship event');

        if (discardedCardsIndexes.length === 0) return;

        yield* put(disposeCardsFromPlayerHand(currentPlayer, discardedCardsIndexes, "event card (discard & repair)"))

        const modulesToRepairPositions = yield* request(
            chooseModulesToRepairByDiscardedCardsRequest(currentPlayer, discardedCardsIndexes.length),
            chooseModulesToRepairByDiscardedCardsResponse
        );

        // TODO: something wrong with the checks
        if (modulesToRepairPositions.length > 2) {
            throw new Error("Too many modules to repair");
        }

        for (let modulePosition of modulesToRepairPositions) {
            yield* put(changeModuleHealth(currentPlayer, modulePosition, 2, "event card (discard & repair)"));
        }
    },
    [EventTypes.MoveDamage]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);

        if (!SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
            return;
        }

        const moveDamageData = yield* request(
            chooseModuleToMoveDamageRequest(currentPlayer, MoveDamageReason.EventCard),
            chooseModuleToMoveDamageResponse
        );

        if (moveDamageData === undefined) {
            return;
        }

        const willBeDestructed = SpaceshipGetters.getModuleByPosition(currentPlayer.spaceship, moveDamageData.to).health === 1;

        yield* put(changeModuleHealth(currentPlayer, moveDamageData.from, 1, "event card (move damage, part 1)"));
        yield* put(changeModuleHealth(currentPlayer, moveDamageData.to, -1, "event card (move damage, part 2)"));

        if (willBeDestructed) {
            yield* put(destructSpaceshipModules(currentPlayer, [moveDamageData.to], "discard", "hand"));
        }
    }, [EventTypes.DiscardCardsAndTakeBuildingCards]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        if (currentPlayer.hand.length == 0) {
            return;
        }

        const cardsToDiscardIndexes = yield* request(
            chooseCardsToDiscardAndTakeAnotherRequest(currentPlayer),
            chooseCardsToDiscardAndTakeAnotherResponse
        );

        if (cardsToDiscardIndexes.length > 2) {
            throw new Error("Too many cards to discard");
        }

        yield* put(disposeCardsFromPlayerHand(currentPlayer, cardsToDiscardIndexes, "event card (discard & take modules)"));

        const cards = yield* popCards("module", cardsToDiscardIndexes.length);
        yield* put(pushCardsToHand(currentPlayer, cards));

        yield* showCards(currentPlayer, cards, false);
    }
};

export function* performEvent(event: Event) {
    const state = yield* select();
    yield* eventsPerformFunctions[event.type](state, event);
}