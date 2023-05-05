import BaseEventListener from "./BaseEventListener";
import {Socket} from "socket.io-client";
import Module, {isModule, ModuleTypes} from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Game from "../../Game";
import Vector2 from "../../../../common/Vector2";
import {COLORS} from "../../graphics/constants";
import {Vector} from "matter";

export default class EventCardsEventListener extends BaseEventListener {
    socket: Socket;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    //  permuteThreeCards
    //  permuteThreeCardsAndChooseOne
    //  destroyAnyModuleOnYourSpaceshipEvent
    //  destroyTwoSolarPanelsOnYourSpaceshipEvent
    //  choosePlayerForAttack
    //  chooseModuleToDamageEvent
    //  chooseModuleToRepairEvent
    //  --choosePlayerToStealCardEvent
    //  --chooseCardOfPlayer
    //  chooseCardsForRepairSpaceshipEvent
    //  chooseModulesToRepairByDiscardedCards
    //  chooseModulesToMoveDamage
    //  --chooseCardsToDiscardAndTakeAnother
    addListeners(): void {
        this.socket.on('choosePlayerToStealCardEvent', (playersWithCards: number[], callback: (link: number) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите игрока");

            this.game.controlsScene.chooseFromList("Choose player", playersWithCards.map(v => v.toString())).then((index: number) => {
                callback(playersWithCards[index]);
            });
        });

        this.socket.on('chooseCardOfPlayer', (cards: (Module | Event)[], callback: (cardIndex: number) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите карту");

            this.game.controlsScene.chooseFromList("Choose card", cards.map((card: Module | Event): string => {
                if (isModule(card)) {
                    return (card as Module).name;
                } else {
                    return (card as Event).description;
                }
            })).then(callback);
        });

        this.socket.on('chooseCardsToDiscardAndTakeAnother', (cards: (Module | Event)[], callback: (indexes: number[]) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите до 2-х карт");

            this.game.controlsScene.chooseCards(cards, 2).then(callback);
        });

        this.socket.on('chooseModulesToMoveDamage', (callback: (from?: Vector2, to?: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите модуль, с которого переместить урон");

            let moveDamageFrom: Module;
            let moveDamageTo: Module;

            this.game.spaceshipsScene.chooseModule((module?: Module) => {
                moveDamageFrom = module;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (!module.isDamaged())
                    return false;

                return true;
            }, true, 0xa3b18a);

            this.controls().topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    if (moveDamageFrom === undefined)
                        return;

                    this.game.spaceshipsScene.endChoosingModule();
                    this.controls().topBarDrawer.removeButtons();

                    this.controls().topBarDrawer.setStatus("Выберите модуль, на который переместить урон");

                    this.game.spaceshipsScene.chooseModule((module?: Module) => {
                        moveDamageTo = module;
                    }, (module?: Module, playerLink?: number) => {
                        return playerLink === this.game.link;
                    }, true, 0xa3b18a);

                    this.controls().topBarDrawer.addButtons([{
                        text: "Далее",
                        color: COLORS.BUTTON.PRIMARY,
                        onClick: () => {
                            if (moveDamageTo === undefined)
                                return;

                            this.game.spaceshipsScene.endChoosingModule();
                            this.controls().topBarDrawer.removeButtons();

                            callback(moveDamageFrom.getPosition(), moveDamageTo.getPosition());
                        }
                    }]);
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback();
                }
            }]);
        });

        this.socket.on('chooseCardsForRepairSpaceshipEvent', (cards: (Event | Module)[], callback: (discardedCards: number[]) => void) => {
            this.game.controlsScene.chooseCards(cards, 2).then(callback);
        });

        this.socket.on('chooseModulesToRepairByDiscardedCards', (count: number, callback: (modules: Vector2[]) => void) => {
                this.controls().topBarDrawer.setStatus("Выберите модули для починки (" + count + ")");

                let modules: Module[] = [];

                this.game.spaceshipsScene.chooseModules((chosen: Module[]) => {
                    modules = chosen;
                }, (module?: Module, playerLink?: number) => {
                    if (playerLink !== this.game.link)
                        return false;

                    if (!module.isDamaged())
                        return false;

                    return true;
                }, count, 0xa3b18a);

                this.controls().topBarDrawer.addButtons([{
                    text: "Починить",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        callback(modules.map((m) => m.getPosition()));

                        this.controls().topBarDrawer.removeButtons();
                        this.game.spaceshipsScene.endChoosingModule();
                    }
                }]);
            }
        );

        this.socket.on('chooseModuleToRepairEvent', (callback: (module?: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите модуль для починки");

            let module: Module;

            this.game.spaceshipsScene.chooseModule((chosen: Module) => {
                module = chosen;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (!module.isDamaged())
                    return false;

                return true;
            }, false, 0xa3b18a);

            this.controls().topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback(module.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback();

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('chooseModuleToDamageEvent', (callback: (playerLink?: number, module?: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите модуль, чтобы нанести урон");

            let module: Module;
            let link: number;

            this.game.spaceshipsScene.chooseModule((chosen: Module, playerLink: number) => {
                module = chosen;
                link = playerLink;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink === this.game.link)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, false, 0xa3b18a);

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    callback(link, module.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback();

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('choosePlayerForAttack', (callback: (playerLink: number) => void) => {
            this.controls().topBarDrawer.setStatus("Выберите игрока для атаки");

            let playersToAttack = this.game.players
                .filter(p => p.link !== this.game.link)
                .map(v => v.link.toString());

            this.game.controlsScene.chooseFromList("Choose player", playersToAttack).then((index: number) => {
                callback(parseInt(playersToAttack[index]));
            });
        });


        this.socket.on('destroyTwoSolarPanelsOnYourSpaceshipEvent', (callback: (firstPosition: Vector2, secondPosition?: Vector2) => void) => {
            let count = Math.min(
                this.game.getCurrentPlayer().spaceship.getModulesByType(ModuleTypes.SolarPanel).length, 2
            );
            this.controls().topBarDrawer.setStatus(`Уничтожте солнечные батареи: ${count}`);

            let selectedSolarPanels: Module[] = [];

            this.game.spaceshipsScene.chooseModules((chosen: Module[]) => {
                selectedSolarPanels = chosen;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (module.type !== ModuleTypes.SolarPanel)
                    return false;

                return true;
            }, count, 0xa3b18a);

            this.controls().topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (selectedSolarPanels.length < count) return;

                    if (count === 1)
                        callback(selectedSolarPanels[0].getPosition());
                    else
                        callback(selectedSolarPanels[0].getPosition(), selectedSolarPanels[1].getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('destroyAnyModuleOnYourSpaceshipEvent', (callback: (position: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus(`Уничтожте модуль`);

            let selectedModule: Module;

            this.game.spaceshipsScene.chooseModule((chosen: Module) => {
                selectedModule = chosen;
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, true, 0xa3b18a);

            this.controls().topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (!selectedModule) return;

                    callback(selectedModule.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('permuteThreeCardsAndChooseOne', (cards: Event[], callback: (order: number[]) => void) => {
            this.controls().topBarDrawer.setStatus("Переставьте карточки")

            this.controls().permuteCards(cards).then((order: number[]) => {
                callback(order);
            });
        });

        this.socket.on('permuteThreeCards', (cards: Event[], callback: (order: number[]) => void) => {
            this.controls().topBarDrawer.setStatus("Переставьте карточки")

            this.controls().permuteCards(cards).then((order: number[]) => {
                callback(order);
            });
        });
    }
}