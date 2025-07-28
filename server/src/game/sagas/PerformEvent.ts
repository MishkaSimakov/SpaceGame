import {Event, EventTypes} from "@common/events/Event";
import GameState from "../GameState";
import {
    beginFight,
    changePlayerEnergy,
    choosePlayerForAttackRequest, choosePlayerForAttackResponse,
    destructSpaceshipModules,
    disposeCardsFromPlayerHand,
    playerSkipNextTurn, pushCurrentEventToPlayerHand, showCardsToPlayersRequest, showCardsToPlayersResponse
} from "../actions/Main";
import {StateGetters} from "@common/getters/State";
import {dice, put, select} from "../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import Module, {ModuleTypes} from "@common/modules/Module";
import {request} from "./Utils";
import Vector2 from "@common/Vector2";
import {fight} from "./old/Fight";
import {AttackReason} from "@common/Types";
import {drawOneCard} from "./DrawCards";
import {damageModule} from "./DamageModule";
import * as assert from "node:assert";

// pop n cards from the stack
// change player energy

let eventsPerformFunctions: Record<EventTypes, (state: GameState, event: Event) => Generator> = {
    [EventTypes.PutTopThreeCardsInAnyOrder]: async (state: GameState) => {
        let topThreeCards: Event[] = state.popEventCards(3);

        const order: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('permuteThreeCards', topThreeCards);
        let newOrderedCards: Event[] = [];

        for (let i = 0; i < 3; ++i) {
            newOrderedCards.push(topThreeCards[order[i]]);
        }

        game.gameData.pushEventCards(newOrderedCards);
    },
    [EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop]: async (game: Game) => {
        let topThreeCards: Event[] = game.gameData.popEventCards(3);

        const order: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('permuteThreeCardsAndChooseOne', topThreeCards);
        let newOrderedCards: Event[] = [];
        let selectedCard: Event = topThreeCards[order[0]];

        for (let i = 1; i < 3; ++i) {
            newOrderedCards.push(topThreeCards[order[i]]);
        }

        game.gameData.pushEventCards(newOrderedCards);

        await performEvent(selectedCard, game);
    },
    [EventTypes.TakeOneBuildingCard]: async (game: Game) => {
        let cards = game.gameData.popModuleCards(1);
        game.currentPlayer.hand.push(...cards);

        await game.showCardsToPlayer(cards, game.currentPlayer, false);
    },
    [EventTypes.TakeTwoBuildingCards]: async (game: Game) => {
        let cards = game.gameData.popModuleCards(2);
        game.currentPlayer.hand.push(...cards);

        await game.showCardsToPlayer(cards, game.currentPlayer, false);
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
    [EventTypes.DestroyAnyModuleOnYourSpaceship]: async (game: Game) => {
        if (game.currentPlayer.spaceship.modules.length === 1)
            return;

        const position: Vector2 = await game.emitToCurrentPlayerAndWaitAcknowledgment('destroyAnyModuleOnYourSpaceshipEvent');
        let module = game.currentPlayer.spaceship.getModuleByPosition(position);

        // TODO: check if this module doesn't exist

        game.currentPlayer.spaceship.removeModule(module);
        game.gameData.discardCards([module]);

        let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
        game.currentPlayer.spaceship.removeModule(unconnected);
        game.currentPlayer.hand.push(...unconnected);
    },
    [EventTypes.DestroyTwoSolarPanelsOnYourSpaceship]: function* (state: GameState) {
        const player = StateGetters.currentPlayer(state);

        if (SpaceshipGetters.getModulesByType(player.spaceship, ModuleTypes.SolarPanel).length === 0) {
            return;
        }

        const positions: Vector2[] = yield* request(
            destroyTwoSolarPanelsOnYourSpaceshipEventRequest(player.id),
            destroyTwoSolarPanelsOnYourSpaceshipEventResponse
        );

        if (positions.length !== 1 && positions.length !== 2) {
            // TODO: retry request
            throw new Error("Wrong value");
        }

        const modules: Module[] = positions.map(pos => SpaceshipGetters.getModuleByPosition(player.spaceship, pos));
        if (modules.some(m => m.type !== ModuleTypes.SolarPanel)) {
            throw new Error("User have chosen wrong module type.");
        }

        yield* put(destructSpaceshipModules(player, positions, "discard"));
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
        // let attackedPlayer = await game.choosePlayerForAttack(AttackReason.AttackAnyEventCard);
        const {victim} = yield* request(
            choosePlayerForAttackRequest(StateGetters.currentPlayer(state).id, AttackReason.AttackAnyEventCard),
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

        const cards = [];
        for (let i = 0; i < cardsCount; ++i) {
            cards.push(yield* drawOneCard("module"));
        }

        yield* request(
            showCardsToPlayersRequest(cards, StateGetters.currentPlayer(state), false),
            showCardsToPlayersResponse
        );
    },
    [EventTypes.TossDiceAndDealDamage]: function* (state: GameState) {
        let damageToDeal = (yield* dice()) <= 4 ? 1 : 2;

        const {victimId, victimModulePosition} = yield* request(
            chooseModuleToDamageRequest(StateGetters.currentPlayer(state)),
            chooseModuleToDamageResponse
        );

        // let damageData: {
        //     playerId?: number,
        //     modulePosition?: Vector2
        // } = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModuleToDamageEvent', damageToDeal);

        if (victimId === undefined) return;

        let victim = StateGetters.playerById(state, victimId);
        let victimModule = SpaceshipGetters.getModuleByPosition(victim.spaceship, victimModulePosition);

        yield* damageModule(victim, StateGetters.currentPlayer(state), victimModule, true);
    },
    [EventTypes.TossDiceAndGetEnergy]: function* (state: GameState) {
        const energyCount = (yield* dice()) <= 4 ? 1 : 2;

        yield* put(changePlayerEnergy(StateGetters.currentPlayer(state), energyCount, "event card (toss dice and get energy)"));
    },
    [EventTypes.TossDiceAndRepairYourModule]: async (game: Game) => {
        if (!game.currentPlayer.spaceship.hasDamagedModules())
            return;

        let diceResult = tossDice();

        let moduleToRepairPosition: Vector2 = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModuleToRepairEvent');

        if (moduleToRepairPosition === undefined)
            return;

        let moduleToRepair = game.currentPlayer.spaceship.getModuleByPosition(moduleToRepairPosition);
        moduleToRepair.health = Math.min(moduleToRepair.health + diceResult, moduleToRepair.totalHealth);
    },
    [EventTypes.SaveCardAndThenAttack]: function* (state: GameState) {
        yield* put(pushCurrentEventToPlayerHand(StateGetters.currentPlayer(state)));
    },
    [EventTypes.SaveCardAndThenDealDamage]: function* (state: GameState) {
        yield* put(pushCurrentEventToPlayerHand(StateGetters.currentPlayer(state)));
    },
    [EventTypes.ChoosePlayerAndStealHisCard]: function* (state: GameState) {
        const currentPlayer = StateGetters.currentPlayer(state);
        let playersWithCards = state.players.filter(p => (p.hand.length !== 0) && (p.id !== currentPlayer.id));

        if (playersWithCards.length === 0) return;

        let chosenPlayerId: number = await game.emitToCurrentPlayerAndWaitAcknowledgment('choosePlayerToStealCardEvent', playersWithCards.map(p => p.id));
        let chosenPlayer = game.getPlayerById(chosenPlayerId);

        let chosenCardIndex: number = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardOfPlayer', chosenPlayer.hand);

        let chosenCard = chosenPlayer.hand[chosenCardIndex];
        chosenPlayer.hand.splice(chosenCardIndex, 1);
        game.currentPlayer.hand.push(chosenCard);
    },
    [EventTypes.DiscardCardAndRepairSpaceship]: async (game: Game) => {
        if (game.currentPlayer.hand.length === 0)
            return;

        const discardedCardsIndexes: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardsForRepairSpaceshipEvent', game.currentPlayer.hand);

        if (discardedCardsIndexes.length > 2)
            throw new Error('Too many discarded cards in DiscardCardAndRepairSpaceship event');

        if (discardedCardsIndexes.length === 0) return;

        let discardedCards = discardedCardsIndexes.map(index => game.currentPlayer.hand[index]);

        for (let discardedCard of discardedCards) {
            game.currentPlayer.hand = game.currentPlayer.hand.filter((c) => c !== discardedCard);
        }

        game.gameData.discardCards(discardedCards);

        let modulesToRepairPositions: Vector2[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModulesToRepairByDiscardedCards', discardedCardsIndexes.length);
        if (modulesToRepairPositions.length > 2) {
            throw new Error("Too many modules to repair");
        }

        for (let modulePosition of modulesToRepairPositions) {
            let module = game.currentPlayer.spaceship.getModuleByPosition(modulePosition);

            module.health = Math.min(module.health + 2, module.totalHealth);
        }
    },
    [EventTypes.MoveDamage]: async (game: Game) => {
        if (!game.currentPlayer.spaceship.hasDamagedModules()) {
            return;
        }

        type MoveData = {
            from: Vector2,
            to: Vector2
        }

        let moveDamageData: MoveData | undefined = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModulesToMoveDamage', MoveDamageReason.EventCard);

        if (moveDamageData === undefined) {
            return;
        }

        let moduleToMoveDamageFrom: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.from);
        let moduleToMoveDamageTo: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.to);

        moduleToMoveDamageFrom.health = Math.min(moduleToMoveDamageFrom.totalHealth, moduleToMoveDamageFrom.health + 1);
        moduleToMoveDamageTo.health -= 1;

        if (moduleToMoveDamageTo.health <= 0) {
            game.currentPlayer.spaceship.removeModule(moduleToMoveDamageTo);

            let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
            game.currentPlayer.spaceship.removeModule(unconnected);

            game.currentPlayer.hand.push(...unconnected);

            moduleToMoveDamageTo.health = moduleToMoveDamageTo.totalHealth;
            game.gameData.discardCards([moduleToMoveDamageTo]);
        }
    },
    [EventTypes.DiscardCardsAndTakeBuildingCards]: async (game: Game) => {
        if (game.currentPlayer.hand.length == 0) {
            return;
        }

        const cardsToDiscardIndexes: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardsToDiscardAndTakeAnother', game.currentPlayer.hand);
        if (cardsToDiscardIndexes.length > 2) {
            throw new Error("Too many cards to discard");
        }

        let cardsToDiscard: (Module | Event)[] = cardsToDiscardIndexes.map((index) => game.currentPlayer.hand[index]);

        game.currentPlayer.hand = game.currentPlayer.hand.filter((card) => !cardsToDiscard.includes(card));

        let cards = game.gameData.popModuleCards(cardsToDiscard.length);
        game.currentPlayer.hand.push(...cards);

        game.gameData.discardCards(cardsToDiscard);

        await game.showCardsToPlayer(cards, game.currentPlayer, false);
    }
}

export function* performEvent() {
    const state = yield* select();
    const event = state.currentEvent;

    assert.ok(event !== undefined);

    yield* eventsPerformFunctions[event.type](state, event);
}