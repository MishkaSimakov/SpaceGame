import BaseEventListener from "./BaseEventListener";
import {Module, ModuleTypes} from "../../../../common/modules/Module";
import {Event} from "../../../../common/events/Event";
import Game from "../../Game";
import Vector2 from "../../../../common/Vector2";
import {COLORS} from "../../graphics/constants";
import {MoveDamageReason} from "../../../../common/Types";
import SocketManager from "../SocketManager";
import Color from "../../graphics/Color";
import {Button} from "../../graphics/shapes/Button";

export default class EventCardsEventListener extends BaseEventListener {
    socket: SocketManager;
    game: Game;

    constructor(...args: ConstructorParameters<typeof BaseEventListener>) {
        super(...args);
    }

    addListeners(): void {
        this.socket.on('choosePlayerToStealCardEvent', (playersWithCards: number[], callback: (id: number) => void) => {
            // TODO: do this!!!
            // let players = playersWithCards.map(id => this.game.getAllPlayers().find(p => p.id === id));

            this.game.controlsScene.chooseFromList("Выберите игрока", playersWithCards.map(v => v.toString())).then((index: number) => {
                callback(playersWithCards[index]);
            });
        });

        this.socket.on('chooseCardOfPlayer', (cards: (Module | Event)[], callback: (cardIndex: number) => void) => {
            this.game.controlsScene
                .chooseFromList("Выберите карту", cards.map(c => c.toString()))
                .then(callback);
        });

        this.socket.on('chooseCardsToDiscardAndTakeAnother', (cards: (Module | Event)[], callback: (indexes: number[]) => void) => {
            this.game.controlsScene.chooseCards(cards, 2, "Выберите до 2-х карт").then(callback);
        });

        this.socket.on('chooseModulesToMoveDamage', (moveDamageReason: MoveDamageReason, callback?: (modules?: {
            from: Vector2,
            to: Vector2
        }) => void) => {
            this.controls().chooseModulesToMoveDamage(moveDamageReason).then(callback);
        });

        this.socket.on('chooseCardsForRepairSpaceshipEvent', (cards: (Event | Module)[], callback: (discardedCards: number[]) => void) => {
            this.game.controlsScene.chooseCards(cards, 2, "Выберите до 2-х карт").then(callback);
        });

        this.socket.on('chooseModulesToRepairByDiscardedCards', (count: number, callback: (modules: Vector2[]) => void) => {
                this.controls().topBarDrawer.setStatus("выберите модули для починки (" + count + ")");

                let modules: Module[] = [];

                this.game.spaceshipsScene.chooseModules((chosen: Module[]) => {
                    modules = chosen;
                }, (module?: Module, playerId?: number) => {
                    if (playerId !== this.game.currentPlayer.id)
                        return false;

                    if (!module.isDamaged())
                        return false;

                    return true;
                }, count, Color.fromHex('#a3b18a'));

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
            }, (module?: Module, playerId?: number) => {
                if (playerId !== this.game.currentPlayer.id)
                    return false;

                if (!module.isDamaged())
                    return false;

                return true;
            }, false, Color.fromHex('#a3b18a'));

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

        this.socket.on('chooseModuleToDamageEvent', (damageToDeal: number, callback: (playerId?: number, module?: Vector2) => void) => {
            this.controls().topBarDrawer.setStatus(`выберите модуль, чтобы нанести урон (${damageToDeal})`);

            let module: Module;
            let id: number;

            this.game.spaceshipsScene.chooseModule((chosen: Module, playerId: number) => {
                module = chosen;
                id = playerId;

                (this.controls().topBarDrawer.buttonsGroup.children[0] as Button).disabled(module === undefined);
            }, (module?: Module, playerId?: number) => {
                if (playerId === this.game.currentPlayer.id)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, false, Color.fromHex('#a3b18a'));

            this.controls().topBarDrawer.addButtons([{
                text: "Атаковать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    if (module) {
                        callback(id, module.getPosition());
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

            (this.controls().topBarDrawer.buttonsGroup.children[0] as Button).disabled(true);
        });

        this.socket.on('destroyTwoSolarPanelsOnYourSpaceshipEvent', (callback: (firstPosition: Vector2, secondPosition?: Vector2) => void) => {
            let count = Math.min(
                this.game.getCurrentPlayer().spaceship.getModulesByType(ModuleTypes.SolarPanel).length, 2
            );
            this.controls().topBarDrawer.setStatus(`уничтожьте солнечные батареи: ${count}`);

            let selectedSolarPanels: Module[] = [];

            this.game.spaceshipsScene.chooseModules((chosen: Module[]) => {
                selectedSolarPanels = chosen;

                this.controls().topBarDrawer.setButtonsDisabled(selectedSolarPanels.length < count);
            }, (module?: Module, playerId?: number) => {
                if (playerId !== this.game.currentPlayer.id)
                    return false;

                if (module.type !== ModuleTypes.SolarPanel)
                    return false;

                return true;
            }, count, Color.fromHex('#a3b18a'));

            this.controls().topBarDrawer.setButtonsDisabled(true);

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
            this.controls().topBarDrawer.setStatus(`уничтожьте модуль`);

            let selectedModule: Module;

            this.game.spaceshipsScene.chooseModule((chosen: Module) => {
                selectedModule = chosen;

                this.controls().topBarDrawer.setButtonsDisabled(selectedModule === undefined);
            }, (module?: Module, playerId?: number) => {
                if (playerId !== this.game.currentPlayer.id)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, true, Color.fromHex('#a3b18a'));

            this.controls().topBarDrawer.setButtonsDisabled(true);

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

        this.socket.on('chooseModuleToDealDamage', (enemyId: number, callback: (position: Vector2) => void) => {
            this.controls().topBarDrawer.removeButtons();
            this.game.spaceshipsScene.endChoosingModule();

            this.controls().topBarDrawer.setStatus(`выберите модуль, чтобы нанести 1 урон`);

            let selectedModule: Module;

            this.game.spaceshipsScene.chooseModule((chosen: Module) => {
                selectedModule = chosen;

                this.controls().topBarDrawer.setButtonsDisabled(selectedModule === undefined);
            }, (module?: Module, playerId?: number) => {
                if (playerId !== enemyId)
                    return false;

                if (module.isMain)
                    return false;

                return true;
            }, true, Color.fromHex('#a3b18a'));

            this.controls().topBarDrawer.setButtonsDisabled(true);

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
