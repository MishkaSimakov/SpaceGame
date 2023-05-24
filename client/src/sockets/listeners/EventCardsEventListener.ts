import BaseEventListener from "./BaseEventListener";
import Module, {isModule, ModuleTypes} from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Game from "../../Game";
import Vector2 from "../../../../common/Vector2";
import {COLORS} from "../../graphics/constants";
import {MoveDamageReason} from "../../../../common/Types";
import SocketManager from "../SocketManager";

export default class EventCardsEventListener extends BaseEventListener {
    socket: SocketManager;
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
            this.controls().topBarDrawer.setStatus("выберите игрока");

            this.game.controlsScene.chooseFromList("Choose player", playersWithCards.map(v => v.toString())).then((index: number) => {
                this.controls().topBarDrawer.clearStatus();

                callback(playersWithCards[index]);
            });
        });

        this.socket.on('chooseCardOfPlayer', (cards: (Module | Event)[], callback: (cardIndex: number) => void) => {
            this.controls().topBarDrawer.setStatus("выберите карту");

            this.game.controlsScene.chooseFromList("Выберите карту", cards.map((card: Module | Event): string => {
                if (isModule(card)) {
                    return (card as Module).name;
                } else {
                    return (card as Event).description;
                }
            })).then((cardIndex: number) => {
                this.controls().topBarDrawer.clearStatus();

                callback(cardIndex);
            });
        });

        this.socket.on('chooseCardsToDiscardAndTakeAnother', (cards: (Module | Event)[], callback: (indexes: number[]) => void) => {
            this.controls().topBarDrawer.setStatus("выберите до 2-х карт");

            this.game.controlsScene.chooseCards(cards, 2).then((indexes: number[]) => {
                this.controls().topBarDrawer.clearStatus();

                callback(indexes);
            });
        });

        this.socket.on('chooseModulesToMoveDamage', (moveDamageReason: MoveDamageReason, callback?: (modules?: {
            from: Vector2,
            to: Vector2
        }) => void) => {
            this.controls().chooseModulesToMoveDamage(moveDamageReason).then(callback);
        });

        this.socket.on('chooseCardsForRepairSpaceshipEvent', (cards: (Event | Module)[], callback: (discardedCards: number[]) => void) => {
            this.game.controlsScene.chooseCards(cards, 2).then(callback);
        });

        this.socket.on('chooseModulesToRepairByDiscardedCards', (count: number, callback: (modules: Vector2[]) => void) => {
                this.controls().topBarDrawer.setStatus("выберите модули для починки (" + count + ")");

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
                        this.controls().topBarDrawer.clearStatus();
                        this.game.spaceshipsScene.endChoosingModule();
                    }
                }]);
            }
        );

        this.socket.on('chooseModuleToRepairEvent', (callback: (module?: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus("выберите модуль для починки");

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
                    callback(module?.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback();

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('chooseModuleToDamageEvent', (callback: (playerLink?: number, module?: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus("выберите модуль, чтобы нанести урон");

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
                    if (module) {
                        callback(link, module.getPosition());
                    } else {
                        callback();
                    }

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    callback();

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('destroyTwoSolarPanelsOnYourSpaceshipEvent', (callback: (firstPosition: Vector2, secondPosition?: Vector2) => void) => {
            let count = Math.min(
                this.game.getCurrentPlayer().spaceship.getModulesByType(ModuleTypes.SolarPanel).length, 2
            );
            this.controls().topBarDrawer.setStatus(`уничтожте солнечные батареи: ${count}`);

            let selectedSolarPanels: Module[] = [];

            this.game.spaceshipsScene.chooseModules((chosen: Module[]) => {
                selectedSolarPanels = chosen;

                this.controls().topBarDrawer.setButtonsDisabled(selectedSolarPanels.length >= count);
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (module.type !== ModuleTypes.SolarPanel)
                    return false;

                return true;
            }, count, 0xa3b18a);

            this.controls().topBarDrawer.setButtonsDisabled(false);

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
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('destroyAnyModuleOnYourSpaceshipEvent', (callback: (position: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus(`уничтожте модуль`);

            let selectedModule: Module;

            this.game.spaceshipsScene.chooseModule((chosen: Module) => {
                selectedModule = chosen;

                this.controls().topBarDrawer.setButtonsDisabled(selectedModule !== undefined);
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.game.link)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, true, 0xa3b18a);

            this.controls().topBarDrawer.setButtonsDisabled(false);

            this.controls().topBarDrawer.addButtons([{
                text: "Уничтожить",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (!selectedModule) return;

                    callback(selectedModule.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });

        this.socket.on('permuteThreeCardsAndChooseOne', (cards: Event[], callback: (order: number[]) => void) => {
            this.controls().topBarDrawer.setStatus("переставьте карточки")

            this.controls().permuteCards(cards).then((order: number[]) => {
                this.controls().topBarDrawer.clearStatus();

                callback(order);
            });
        });

        this.socket.on('permuteThreeCards', (cards: Event[], callback: (order: number[]) => void) => {
            this.controls().topBarDrawer.setStatus("переставьте карточки")

            this.controls().permuteCards(cards).then((order: number[]) => {
                this.controls().topBarDrawer.clearStatus();

                callback(order);
            });
        });

        this.socket.on('chooseModuleToDealDamage', (enemyLink: number, callback: (position: Vector2) => void) => {
            this.controls().topBarDrawer.removeButtons();
            this.game.spaceshipsScene.endChoosingModule();

            this.controls().topBarDrawer.setStatus(`выберите модуль, чтобы нанести 1 урон`);

            let selectedModule: Module;

            this.game.spaceshipsScene.chooseModule((chosen: Module) => {
                selectedModule = chosen;

                this.controls().topBarDrawer.setButtonsDisabled(selectedModule !== undefined);
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== enemyLink)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, true, 0xa3b18a);

            this.controls().topBarDrawer.setButtonsDisabled(false);

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (!selectedModule) return;

                    callback(selectedModule.getPosition());

                    this.controls().topBarDrawer.removeButtons();
                    this.controls().topBarDrawer.clearStatus();
                    this.game.spaceshipsScene.endChoosingModule();
                }
            }]);
        });
    }
}