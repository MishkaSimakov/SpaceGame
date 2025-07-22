import Game from "../../Game";
import Player from "../../../../../common/Player";
import Module, {ModuleTypes} from "../../../../../common/modules/Module";
import {EventTypes, Event} from "../../../../../common/events/Event";
import Vector2 from "../../../../../common/Vector2";
import {AttackReason, MoveDamageReason} from "../../../../../common/Types";

function tossDice(): number {
    return Math.floor(Math.random() * 6) + 1;
}

// TODO: uncomment
// let eventsPerformFunctions: Record<EventTypes, (game: Game, event: Event) => Promise<void>> = {
//     [EventTypes.PutTopThreeCardsInAnyOrder]: async (game: Game) => {
//         let topThreeCards: Event[] = game.gameData.popEventCards(3);
//
//         const order: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('permuteThreeCards', topThreeCards);
//         let newOrderedCards: Event[] = [];
//
//         for (let i = 0; i < 3; ++i) {
//             newOrderedCards.push(topThreeCards[order[i]]);
//         }
//
//         game.gameData.pushEventCards(newOrderedCards);
//     },
//     [EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop]: async (game: Game) => {
//         let topThreeCards: Event[] = game.gameData.popEventCards(3);
//
//         const order: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('permuteThreeCardsAndChooseOne', topThreeCards);
//         let newOrderedCards: Event[] = [];
//         let selectedCard: Event = topThreeCards[order[0]];
//
//         for (let i = 1; i < 3; ++i) {
//             newOrderedCards.push(topThreeCards[order[i]]);
//         }
//
//         game.gameData.pushEventCards(newOrderedCards);
//
//         await performEvent(selectedCard, game);
//     },
//     [EventTypes.TakeOneBuildingCard]: async (game: Game) => {
//         let cards = game.gameData.popModuleCards(1);
//         game.currentPlayer.hand.push(...cards);
//
//         await game.showCardsToPlayer(cards, game.currentPlayer, false);
//     },
//     [EventTypes.TakeTwoBuildingCards]: async (game: Game) => {
//         let cards = game.gameData.popModuleCards(2);
//         game.currentPlayer.hand.push(...cards);
//
//         await game.showCardsToPlayer(cards, game.currentPlayer, false);
//     },
//     [EventTypes.LooseFiveEnergy]: async (game: Game) => {
//         game.currentPlayer.energy -= 1;
//     },
//     [EventTypes.TakeFiveEnergy]: async (game: Game) => {
//         game.currentPlayer.energy += 1;
//     },
//     [EventTypes.SkipNextTurn]: async (game: Game) => {
//         game.currentPlayer.skipNextTurn = true;
//     },
//     [EventTypes.LooseAllYourCards]: async (game: Game) => {
//         game.gameData.discardCards(game.currentPlayer.hand);
//
//         game.currentPlayer.hand = [];
//     },
//     [EventTypes.DestroyAnyModuleOnYourSpaceship]: async (game: Game) => {
//         if (game.currentPlayer.spaceship.modules.length === 1)
//             return;
//
//         const position: Vector2 = await game.emitToCurrentPlayerAndWaitAcknowledgment('destroyAnyModuleOnYourSpaceshipEvent');
//         let module = game.currentPlayer.spaceship.getModuleByPosition(position);
//
//         // TODO: check if this module doesn't exist
//
//         game.currentPlayer.spaceship.removeModule(module);
//         game.gameData.discardCards([module]);
//
//         let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
//         game.currentPlayer.spaceship.removeModule(unconnected);
//         game.currentPlayer.hand.push(...unconnected);
//     },
//     [EventTypes.DestroyTwoSolarPanelsOnYourSpaceship]: async (game: Game) => {
//         if (game.currentPlayer.spaceship.getModulesByType(ModuleTypes.SolarPanel).length === 0)
//             return;
//
//         const positions: Vector2[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('destroyTwoSolarPanelsOnYourSpaceshipEvent');
//         if (positions.length !== 1 && positions.length !== 2) {
//             // TODO: retry request
//             throw new Error("Wrong value");
//         }
//
//         let solarPanels: Module[] = positions.map(pos => game.currentPlayer.spaceship.getModuleByPosition(pos));
//
//         game.currentPlayer.spaceship.removeModule(solarPanels);
//         game.gameData.discardCards(solarPanels);
//
//         let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
//         game.currentPlayer.spaceship.removeModule(unconnected);
//         game.currentPlayer.hand.push(...unconnected);
//     },
//     [EventTypes.AttackRight]: async (game: Game) => {
//         let attackedPlayer = game.getPlayerIndexByOffset(1);
//
//         await game.attackPlayer(attackedPlayer);
//     },
//     [EventTypes.AttackLeft]: async (game: Game) => {
//         let attackedPlayer = game.getPlayerIndexByOffset(-1);
//
//         await game.attackPlayer(attackedPlayer);
//     },
//     [EventTypes.AttackNextToRight]: async (game: Game) => {
//         let attackedPlayer = game.getPlayerIndexByOffset(game.gameData.getPlayers().length > 2 ? 2 : 1);
//
//         await game.attackPlayer(attackedPlayer);
//     },
//     [EventTypes.AttackNextToLeft]: async (game: Game) => {
//         let attackedPlayer = game.getPlayerIndexByOffset(game.gameData.getPlayers().length > 2 ? -2 : -1);
//
//         await game.attackPlayer(attackedPlayer);
//     },
//     [EventTypes.AttackAny]: async (game: Game) => {
//         let attackedPlayer = await game.choosePlayerForAttack(AttackReason.AttackAnyEventCard);
//
//         if (!attackedPlayer) {
//             throw new Error("Attacked player is undefined in choosing player for attack in AttackAny event card");
//         }
//
//         await game.attackPlayer(attackedPlayer);
//     },
//     [EventTypes.TossDiceAndTakeBuildingCards]: async (game: Game) => {
//         let cardsCount = tossDice() <= 4 ? 1 : 2;
//
//         let cards = game.gameData.popModuleCards(cardsCount);
//         game.currentPlayer.hand.push(...cards);
//
//         await game.showCardsToPlayer(cards, game.currentPlayer, false);
//     },
//     [EventTypes.TossDiceAndDealDamage]: async (game: Game) => {
//         let damageToDeal = tossDice() <= 4 ? 1 : 2;
//
//         let damageData: {
//             playerId?: number,
//             modulePosition?: Vector2
//         } = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModuleToDamageEvent', damageToDeal);
//
//         if (damageData.playerId === undefined) return;
//
//         let playerToDamage: Player = game.getPlayerById(damageData.playerId);
//         let moduleToDamage: Module = playerToDamage.spaceship.getModuleByPosition(damageData.modulePosition);
//
//         let destroyed = playerToDamage.spaceship.damage(moduleToDamage, damageToDeal, false);
//
//         game.handleDestroyedModules(playerToDamage, game.currentPlayer, destroyed, true);
//     },
//     [EventTypes.TossDiceAndGetEnergy]: async (game: Game) => {
//         let energyCount = tossDice() <= 4 ? 1 : 2;
//
//         game.currentPlayer.energy += energyCount;
//     },
//     [EventTypes.TossDiceAndRepairYourModule]: async (game: Game) => {
//         if (!game.currentPlayer.spaceship.hasDamagedModules())
//             return;
//
//         let diceResult = tossDice();
//
//         let moduleToRepairPosition: Vector2 = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModuleToRepairEvent');
//
//         if (moduleToRepairPosition === undefined)
//             return;
//
//         let moduleToRepair = game.currentPlayer.spaceship.getModuleByPosition(moduleToRepairPosition);
//         moduleToRepair.health = Math.min(moduleToRepair.health + diceResult, moduleToRepair.totalHealth);
//     },
//     [EventTypes.SaveCardAndThenAttack]: async (game: Game, event: Event) => {
//         game.currentPlayer.hand.push(event);
//     },
//     [EventTypes.SaveCardAndThenDealDamage]: async (game: Game, event: Event) => {
//         game.currentPlayer.hand.push(event);
//     },
//     [EventTypes.ChoosePlayerAndStealHisCard]: async (game: Game) => {
//         let playersWithCards = game.gameData.getPlayers().filter(p => (p.hand.length !== 0) && (p.id !== game.currentPlayer.id));
//
//         if (playersWithCards.length === 0)
//             return;
//
//         let chosenPlayerId: number = await game.emitToCurrentPlayerAndWaitAcknowledgment('choosePlayerToStealCardEvent', playersWithCards.map(p => p.id));
//         let chosenPlayer = game.getPlayerById(chosenPlayerId);
//
//         let chosenCardIndex: number = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardOfPlayer', chosenPlayer.hand);
//
//         let chosenCard = chosenPlayer.hand[chosenCardIndex];
//         chosenPlayer.hand.splice(chosenCardIndex, 1);
//         game.currentPlayer.hand.push(chosenCard);
//     },
//     [EventTypes.DiscardCardAndRepairSpaceship]: async (game: Game) => {
//         if (game.currentPlayer.hand.length === 0)
//             return;
//
//         const discardedCardsIndexes: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardsForRepairSpaceshipEvent', game.currentPlayer.hand);
//
//         if (discardedCardsIndexes.length > 2)
//             throw new Error('Too many discarded cards in DiscardCardAndRepairSpaceship event');
//
//         if (discardedCardsIndexes.length === 0) return;
//
//         let discardedCards = discardedCardsIndexes.map(index => game.currentPlayer.hand[index]);
//
//         for (let discardedCard of discardedCards) {
//             game.currentPlayer.hand = game.currentPlayer.hand.filter((c) => c !== discardedCard);
//         }
//
//         game.gameData.discardCards(discardedCards);
//
//         let modulesToRepairPositions: Vector2[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModulesToRepairByDiscardedCards', discardedCardsIndexes.length);
//         if (modulesToRepairPositions.length > 2) {
//             throw new Error("Too many modules to repair");
//         }
//
//         for (let modulePosition of modulesToRepairPositions) {
//             let module = game.currentPlayer.spaceship.getModuleByPosition(modulePosition);
//
//             module.health = Math.min(module.health + 2, module.totalHealth);
//         }
//     },
//     [EventTypes.MoveDamage]: async (game: Game) => {
//         if (!game.currentPlayer.spaceship.hasDamagedModules()) {
//             return;
//         }
//
//         type MoveData = {
//             from: Vector2,
//             to: Vector2
//         }
//
//         let moveDamageData: MoveData | undefined = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModulesToMoveDamage', MoveDamageReason.EventCard);
//
//         if (moveDamageData === undefined) {
//             return;
//         }
//
//         let moduleToMoveDamageFrom: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.from);
//         let moduleToMoveDamageTo: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.to);
//
//         moduleToMoveDamageFrom.health = Math.min(moduleToMoveDamageFrom.totalHealth, moduleToMoveDamageFrom.health + 1);
//         moduleToMoveDamageTo.health -= 1;
//
//         if (moduleToMoveDamageTo.health <= 0) {
//             game.currentPlayer.spaceship.removeModule(moduleToMoveDamageTo);
//
//             let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
//             game.currentPlayer.spaceship.removeModule(unconnected);
//
//             game.currentPlayer.hand.push(...unconnected);
//
//             moduleToMoveDamageTo.health = moduleToMoveDamageTo.totalHealth;
//             game.gameData.discardCards([moduleToMoveDamageTo]);
//         }
//     },
//     [EventTypes.DiscardCardsAndTakeBuildingCards]: async (game: Game) => {
//         if (game.currentPlayer.hand.length == 0) {
//             return;
//         }
//
//         const cardsToDiscardIndexes: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseCardsToDiscardAndTakeAnother', game.currentPlayer.hand);
//         if (cardsToDiscardIndexes.length > 2) {
//             throw new Error("Too many cards to discard");
//         }
//
//         let cardsToDiscard: (Module | Event)[] = cardsToDiscardIndexes.map((index) => game.currentPlayer.hand[index]);
//
//         game.currentPlayer.hand = game.currentPlayer.hand.filter((card) => !cardsToDiscard.includes(card));
//
//         let cards = game.gameData.popModuleCards(cardsToDiscard.length);
//         game.currentPlayer.hand.push(...cards);
//
//         game.gameData.discardCards(cardsToDiscard);
//
//         await game.showCardsToPlayer(cards, game.currentPlayer, false);
//     }
// }

export default async function performEvent(event: Event, game: Game) {
    // return await eventsPerformFunctions[event.type](game, event);
}
