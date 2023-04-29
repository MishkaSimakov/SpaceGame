import Game from "./Game";
import Player from "../../common/Player";
import FightManager from "./Fight/FightManager";
import Module, {ModuleTypes} from "../../common/modules/Module";
import {EventTypes, Event} from "../../common/events/Event";
import Vector2 from "../../common/Vector2";

function tossDice(): number {
    return Math.floor(Math.random() * 6) + 1;
}

async function attackPlayer(game: Game, attackedPlayer: Player) {
    console.log(`Player ${game.currentPlayer.socketId} has attacked player ${attackedPlayer}`);

    let result: { destroyedPlayer: Player | undefined } = await new Promise(() => {
        let fightManager = new FightManager(game.currentPlayer, attackedPlayer, game);

        return fightManager.fight();
    })

    if (result.destroyedPlayer)
        game.setDestroyed(result.destroyedPlayer);
}

let eventsPerformFunctions: Record<EventTypes, (game: Game, event: Event) => Promise<void>> = {
    [EventTypes.PutTopThreeCardsInAnyOrder]: async (game: Game) => {
        let topThreeCards: Module[] = game.gameData.popModuleCards(3);

        await game.emitToCurrentPlayerAndWait('permuteThreeCards', async (order: number[]) => {
            let newOrderedCards: Module[] = [];

            for (let i = 0; i < 3; ++i) {
                newOrderedCards.push(topThreeCards[order[i]]);
            }

            game.gameData.pushModuleCards(newOrderedCards);
        });
    },
    [EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop]: async (game: Game) => {
        let topThreeCards: Module[] = game.gameData.popModuleCards(3);

        await game.emitToCurrentPlayerAndWait('permuteThreeCardsAndChooseOne', async (order: number[], selected: number) => {
            let newOrderedCards: Module[] = [];
            let selectedCard: Module;

            for (let i = 0; i < 3; ++i) {
                if (order[i] == selected) {
                    selectedCard = topThreeCards[selected];
                } else {
                    newOrderedCards.push(topThreeCards[order[i]]);
                }
            }

            game.gameData.pushModuleCards(newOrderedCards);
            game.currentPlayer.hand.push(selectedCard);
        });
    },
    [EventTypes.TakeOneBuildingCard]: async (game: Game) => {
        game.currentPlayer.hand.push(...game.gameData.popModuleCards(1));
    },
    [EventTypes.TakeTwoBuildingCards]: async (game: Game) => {
        game.currentPlayer.hand.push(...game.gameData.popModuleCards(2));
    },
    [EventTypes.LooseFiveEnergy]: async (game: Game) => {
        game.currentPlayer.energy -= 5;
    },
    [EventTypes.TakeFiveEnergy]: async (game: Game) => {
        game.currentPlayer.energy += 5;
    },
    [EventTypes.SkipNextTurn]: async (game: Game) => {
        game.currentPlayer.skipNextTurn = true;
    },
    [EventTypes.LooseAllYourCards]: async (game: Game) => {
        game.gameData.discardCards(game.currentPlayer.hand);

        game.currentPlayer.hand = [];
    },
    [EventTypes.DestroyAnyModuleOnYourSpaceship]: async (game: Game) => {
        await game.emitToCurrentPlayerAndWait('destroyAnyModuleOnYourSpaceshipEvent', async (position: Vector2) => {
            let module = game.currentPlayer.spaceship.getModuleByPosition(position);

            // TODO: check if this module doesn't exist

            game.currentPlayer.spaceship.removeModule(module);

            game.gameData.discardCards([module]);
        });
    },
    [EventTypes.DestroyTwoSolarPanelsOnYourSpaceship]: async (game: Game) => {
        if (game.currentPlayer.spaceship.getModulesByType(ModuleTypes.SolarPanel).length < 2)
            return;

        await game.emitToCurrentPlayerAndWait('destroyTwoSolarPanelsOnYourSpaceshipEvent', (firstPosition: Vector2, secondPosition: Vector2) => {
            let solarPanels: Module[] = [
                game.currentPlayer.spaceship.getModuleByPosition(firstPosition),
                game.currentPlayer.spaceship.getModuleByPosition(secondPosition)
            ];

            game.currentPlayer.spaceship.removeModule(solarPanels);
            game.gameData.discardCards(solarPanels);
        });
    },
    [EventTypes.AttackRight]: async (game: Game) => {
        let attackedPlayer = game.getPlayerByOffsetFromCurrent(1);

        await attackPlayer(game, attackedPlayer);
    },
    [EventTypes.AttackLeft]: async (game: Game) => {
        let attackedPlayer = game.getPlayerByOffsetFromCurrent(-1);

        await attackPlayer(game, attackedPlayer);
    },
    [EventTypes.AttackNextToRight]: async (game: Game) => {
        let attackedPlayer = game.getPlayerByOffsetFromCurrent(2);

        await attackPlayer(game, attackedPlayer);
    },
    [EventTypes.AttackNextToLeft]: async (game: Game) => {
        let attackedPlayer = game.getPlayerByOffsetFromCurrent(-2);

        await attackPlayer(game, attackedPlayer);
    },
    [EventTypes.AttackAny]: async (game: Game) => {
        let chosenPlayerId: string = await game.emitToCurrentPlayerAndWait('choosePlayerForAttack', (attackedPlayerId: string) => {
            return attackedPlayerId;
        });

        let chosenPlayer = game.players[chosenPlayerId];

        await attackPlayer(game, chosenPlayer);
    },
    [EventTypes.TossDiceAndTakeBuildingCards]: async (game: Game) => {
        let cardsCount = tossDice() <= 4 ? 1 : 2;

        game.currentPlayer.hand.push(...game.gameData.popModuleCards(cardsCount));
    },
    [EventTypes.TossDiceAndDealDamage]: async (game: Game) => {
        let damageToDeal = tossDice() <= 4 ? 2 : 4;

        let damageData: { playerId: string, modulePosition: Vector2 } = await game.emitToCurrentPlayerAndWait('chooseModuleToDamageEvent', (playerId: string, module: Vector2) => {
            return {
                playerId: playerId, modulePosition: module
            };
        });

        let playerToDamage: Player = game.players[damageData.playerId];
        let moduleToDamage: Module = playerToDamage.spaceship.getModuleByPosition(damageData.modulePosition);

        moduleToDamage.health -= damageToDeal;

        if (moduleToDamage.health <= 0) {
            playerToDamage.spaceship.removeModule(moduleToDamage);

            let unconnected = playerToDamage.spaceship.getUnconnectedModules();
            playerToDamage.spaceship.removeModule(unconnected);

            playerToDamage.hand.push(...unconnected);

            moduleToDamage.health = moduleToDamage.totalHealth;
            game.currentPlayer.hand.push(moduleToDamage);
        }
    },
    [EventTypes.TossDiceAndGetEnergy]: async (game: Game) => {
        let energyCount = tossDice() <= 4 ? 5 : 10;

        game.currentPlayer.energy += energyCount;
    },
    [EventTypes.TossDiceAndRepairYourModule]: async (game: Game) => {
        let diceResult = tossDice();

        let moduleToRepairPosition: Vector2 = await game.emitToCurrentPlayerAndWait('chooseModuleToRepairEvent', (module: Vector2) => {
            return module;
        });

        let moduleToRepair = game.currentPlayer.spaceship.getModuleByPosition(moduleToRepairPosition);

        moduleToRepair.health = Math.min(moduleToRepair.health + diceResult, moduleToRepair.totalHealth);
    },
    [EventTypes.SaveCardAndThenAttack]: async (game: Game, event: Event) => {
        game.currentPlayer.hand.push(event);
    },
    [EventTypes.SaveCardAndThenDealDamage]: async (game: Game, event: Event) => {
        game.currentPlayer.hand.push(event);
    },
    [EventTypes.ChoosePlayerAndStealHisCard]: async (game: Game) => {
        let playersWithCards = game.getLinks().filter((link) => (game.getPlayerByLink(link).hand.length !== 0) && (link !== game.currentPlayer.link));

        if (playersWithCards.length === 0)
            return;

        let chosenPlayerLink: number = await game.emitToCurrentPlayerAndWait('choosePlayerToStealCardEvent', playersWithCards, (playerLink: number) => {
            return playerLink;
        });
        let chosenPlayer = game.getPlayerByLink(chosenPlayerLink);

        let chosenCardIndex: number = await game.emitToCurrentPlayerAndWait('chooseCardOfPlayer', chosenPlayer.hand, (chosenCardIndex: number) => {
            return chosenCardIndex;
        });

        let chosenCard = chosenPlayer.hand[chosenCardIndex];

        chosenPlayer.hand = chosenPlayer.hand.slice(chosenCardIndex, 1);

        game.currentPlayer.hand.push(chosenCard);
    },
    [EventTypes.DiscardCardAndRepairSpaceship]: async (game: Game) => {
        let discardedCardsIndexes: number[] = await game.emitToCurrentPlayerAndWait('chooseCardsForRepairSpaceshipEvent', (discardedCards: number[]) => {
            if (discardedCards.length > 2)
                throw new Error('Too many discarded cards in DiscardCardAndRepairSpaceship event');

            return discardedCards;
        });

        let discardedCards = discardedCardsIndexes.map(index => game.currentPlayer.hand[index]);

        for (let discardedCard of discardedCards) {
            game.currentPlayer.hand = game.currentPlayer.hand.filter((c) => c !== discardedCard);
        }

        game.gameData.discardCards(discardedCards);

        let modulesToRepairPositions: Vector2[] = await game.emitToCurrentPlayerAndWait('chooseModulesToRepairByDiscardedCards', discardedCardsIndexes.length, (modules: Vector2[]) => {
            if (modules.length !== discardedCardsIndexes.length)
                throw new Error('Wrong modules to repair count in DiscardCardAndRepairSpaceship event');

            return modules;
        });

        for (let modulePosition of modulesToRepairPositions) {
            let module = game.currentPlayer.spaceship.getModuleByPosition(modulePosition);

            module.health = Math.min(module.health + 2, module.totalHealth);
        }
    },
    [EventTypes.MoveDamage]: async (game: Game) => {
        if (!game.currentPlayer.spaceship.hasDamagedModules()) {
            return;
        }

        let moveDamageData: { from: Vector2, to: Vector2 } = await game.emitToCurrentPlayerAndWait('chooseModulesToMoveDamage', (from: Vector2, to: Vector2) => {
            return {
                from: from, to: to
            };
        });

        if (moveDamageData.to === undefined) {
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

        let cardsToDiscardIndexes: number[] = await game.emitToCurrentPlayerAndWait('chooseCardsToDiscardAndTakeAnother', game.currentPlayer.hand, (cardIndexes: number[]) => {
            return cardIndexes.slice(0, 2);
        });

        let cardsToDiscard: (Module|Event)[] = cardsToDiscardIndexes.map((index) => game.currentPlayer.hand[index]);

        game.currentPlayer.hand = game.currentPlayer.hand.filter((card) => !cardsToDiscard.includes(card));
        game.currentPlayer.hand.push(...game.gameData.popModuleCards(cardsToDiscard.length));

        game.gameData.discardCards(cardsToDiscard);
    }
}

export default async function performEvent(event: Event, game: Game) {
    return await eventsPerformFunctions[event.type](game, event);
}