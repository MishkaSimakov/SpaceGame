import Game from "./Game";
import Player from "../common/Player";
import FightManager from "./FightManager";
import Module, {ModuleTypes} from "../common/modules/Module";
import {EventTypes, Event} from "../common/events/Event";

function tossDice(): number {
    return Math.floor(Math.random() * 6) + 1;
}

async function attackPlayer(game: Game, attackedPlayer: Player) {
    console.log(`Player ${game.currentPlayer.socketId} has attacked player ${attackedPlayer}`);

    let result: { destroyedPlayer: Player | undefined } = await new Promise(resolve => {
        let fightManager = new FightManager(game.currentPlayer, attackedPlayer, (destroyedPlayer) => {
            resolve({
                destroyedPlayer: destroyedPlayer
            });
        }, this);

        fightManager.makeFightIteration();
    })

    if (result.destroyedPlayer)
        game.setDestroyed(result.destroyedPlayer);
}

let eventsPerformFunctions: Record<EventTypes, (game: Game, event: Event) => Promise<void>> = {
    [EventTypes.PutTopThreeCardsInAnyOrder]: async (game: Game) => {

    },
    [EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop]: async (game: Game) => {

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
        await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('destroyAnyModuleOnYourSpaceshipEvent', (position: [number, number]) => {
                let module = game.currentPlayer.spaceship.getModuleByPosition(...position);

                game.currentPlayer.spaceship.removeModule(module);

                game.gameData.discardCards([module]);

                resolve(true);
            });
        });
    },
    [EventTypes.DestroyTwoSolarPanelsOnYourSpaceship]: async (game: Game) => {
        if (game.currentPlayer.spaceship.getModulesByType(ModuleTypes.SolarPanel).length < 2)
            return;

        await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('destroyTwoSolarPanelsOnYourSpaceshipEvent', (firstPosition: [number, number], secondPosition: [number, number]) => {
                let solarPanels: Module[] = [
                    game.currentPlayer.spaceship.getModuleByPosition(...firstPosition),
                    game.currentPlayer.spaceship.getModuleByPosition(...secondPosition)
                ];

                game.currentPlayer.spaceship.removeModule(solarPanels);

                game.gameData.discardCards(solarPanels);

                resolve(true);
            });
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
        let chosenPlayerId: string = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('choosePlayerForAttack', (attackedPlayerId: string) => {
                resolve(attackedPlayerId);
            });
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

        let damageData: { playerId: string, modulePosition: [number, number] } = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('chooseModuleToDamageEvent', (playerId: string, module: [number, number]) => {
                resolve({
                    playerId: playerId,
                    modulePosition: module
                });
            });
        });

        let playerToDamage: Player = game.players[damageData.playerId];
        let moduleToDamage: Module = playerToDamage.spaceship.getModuleByPosition(...damageData.modulePosition);

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

        let moduleToRepairPosition: [number, number] = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('chooseModuleToRepairEvent', (module: [number, number]) => {
                resolve(module);
            });
        });

        let moduleToRepair = game.currentPlayer.spaceship.getModuleByPosition(...moduleToRepairPosition);

        moduleToRepair.health = Math.min(moduleToRepair.health + diceResult, moduleToRepair.totalHealth);
    },
    [EventTypes.SaveCardAndThenAttack]: async (game: Game, event: Event) => {
        game.currentPlayer.hand.push(event);
    },
    [EventTypes.SaveCardAndThenDealDamage]: async (game: Game, event: Event) => {
        game.currentPlayer.hand.push(event);
    },
    [EventTypes.ChoosePlayerAndStealHisCard]: async (game: Game) => {
        let playersWithCards = Object.keys(game.players).filter((id) => game.players[id].hand.length !== 0);

        if (playersWithCards.length === 0)
            return;

        let chosenPlayerId: string = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('choosePlayerToStealCardEvent', playersWithCards, (playerId: string) => {
                resolve(playerId);
            });
        });
        let chosenPlayer = game.players[chosenPlayerId];

        let chosenCardIndex: number = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('chooseCardOfPlayer', chosenPlayer, (chosenCardIndex: number) => {
                resolve(chosenCardIndex);
            });
        });
        let chosenCard = chosenPlayer.hand[chosenCardIndex];

        chosenPlayer.hand = chosenPlayer.hand.slice(chosenCardIndex, 1);

        game.currentPlayer.hand.push(chosenCard);
    },
    [EventTypes.DiscardCardAndRepairSpaceship]: async (game: Game) => {
        let discardedCardsIndexes: number[] = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('chooseCardsForRepairSpaceshipEvent', (discardedCards: number[]) => {
                if (discardedCards.length > 2)
                    throw new Error('Too many discarded cards in DiscardCardAndRepairSpaceship event');

                resolve(discardedCards);
            });
        });

        let discardedCards = discardedCardsIndexes.map(index => game.currentPlayer.hand[index]);

        for (let discardedCard of discardedCards) {
            game.currentPlayer.hand = game.currentPlayer.hand.filter((c) => c !== discardedCard);
        }

        game.gameData.discardCards(discardedCards);

        let modulesToRepairPositions: [number, number][] = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('chooseModulesToRepairByDiscardedCards', discardedCardsIndexes.length, (modules: [number, number][]) => {
                if (modules.length !== discardedCardsIndexes.length)
                    throw new Error('Wrong modules to repair count in DiscardCardAndRepairSpaceship event');

                resolve(modules);
            });
        });

        for (let modulePosition of modulesToRepairPositions) {
            let module = game.currentPlayer.spaceship.getModuleByPosition(...modulePosition);

            module.health = Math.min(module.health + 2, module.totalHealth);
        }
    },
    [EventTypes.MoveDamage]: async (game: Game) => {
        let moveDamageData: { from: [number, number], to: [number, number] } = await new Promise(resolve => {
            game.getSocket(game.currentPlayer).emit('chooseModulesToMoveDamage', (from: [number, number], to: [number, number]) => {
                resolve({
                    from: from,
                    to: to
                });
            });
        });

        let moduleToMoveDamageFrom: Module = game.currentPlayer.spaceship.getModuleByPosition(...moveDamageData.from);
        let moduleToMoveDamageTo: Module = game.currentPlayer.spaceship.getModuleByPosition(...moveDamageData.to);
    },
    [EventTypes.DiscardCardsAndTakeBuildingCards]: async (game: Game) => {

    }
}

export default async function performEvent(event: Event, game: Game) {
    return await eventsPerformFunctions[event.type](game, event);
}