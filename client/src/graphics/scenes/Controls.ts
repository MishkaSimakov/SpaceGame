import Module from "@common/modules/Module";
import Vector2 from "@common/Vector2";
import {Event} from "@common/events/Event";
import {AttackReason, MoveDamageReason} from "@common/Types";
import {OtherPlayer} from "@common/GameForPlayerDTO";

import Game from "../../Game";
import HandDrawer from "../HandDrawer";
import {COLORS} from "../constants";
import TopBarDrawer from "../topbar/TopBarDrawer";
import Scene from "../engine/Scene";
import {Group} from "../engine/Group";
import Color from "../Color";
import {Card} from "../shapes/Card";

import {ChoosePlayerForAttackActivity} from "../activities/ChoosePlayerForAttack";
import {ShowCardsActivity} from "../activities/ShowCards";
import {Activity} from "../activities/Activity";
import {PermuteCardsActivity} from "../activities/PermuteCards";
import {ChooseFromListActivity} from "../activities/ChooseFromList";
import {ChooseCardsActivity, Comparison} from "../activities/ChooseCards";

export default class Controls extends Scene {
    handDrawer: HandDrawer;
    topBarDrawer: TopBarDrawer;
    gameManager: Game;

    activitiesQueue: Activity[] = [];

    constructor(game: Game) {
        super();

        this.gameManager = game;
    }

    adopted() {
        this.handDrawer = new HandDrawer(this.gameManager, this);
        this.topBarDrawer = new TopBarDrawer(this);
    }

    updateData() {
        this.handDrawer.setHandData(this.gameManager.currentPlayer.hand);
        this.handDrawer.redraw();

        this.topBarDrawer.setPlayersData(
            this.gameManager.currentPlayer,
            this.gameManager.otherPlayers,
            this.gameManager.onlineMap,
            this.gameManager.playerTime,
            this.gameManager.messages
        );
    }

    rebuildSpaceship(): Promise<void> {
        return new Promise((resolve) => {
            this.topBarDrawer.setStatus("перестройка корабля");

            this.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.topBarDrawer.clearStatus();
                    this.topBarDrawer.removeButtons();

                    resolve();
                }
            }]);
        });
    }

    // Promise<Awaited<T>> is an identity metafunction for T extends Promise, but typescript
    // requires that a return type of async function is Promise<...>
    async enqueueActivity<T extends Activity>(activity: T): Promise<Awaited<ReturnType<T["activate"]>>> {
        this.activitiesQueue.push(activity);

        // TODO: more than 1 activity in queue
        const res = await activity.activate();
        this.activitiesQueue.shift();
        return res;
    }

    async choosePlayerForAttack(players: OtherPlayer[], attackReason: AttackReason) {
        return await this.enqueueActivity(new ChoosePlayerForAttackActivity(this, players, attackReason));
    }

    async showCards(cards: (Module | Event)[], title?: string): Promise<void> {
        return await this.enqueueActivity(new ShowCardsActivity(this, cards, title));
    }

    async chooseFromList(title: string, values: string[]): Promise<number> {
        return await this.enqueueActivity(new ChooseFromListActivity(this, title, values));
    }

    async discardCards(requiredDiscardCount: number): Promise<number[]> {
        return await this.enqueueActivity(new ChooseCardsActivity(this, "Скиньте лишние карты", {
            type: Comparison.AT_LEAST,
            count: requiredDiscardCount
        }, this.gameManager.getCurrentPlayer().hand));
    }

    async chooseCards(cards: (Module | Event)[], count: number, title: string): Promise<number[]> {
        return await this.enqueueActivity(new ChooseCardsActivity(this, title, {
            type: Comparison.EQUAL,
            count
        }, cards));
    }

    drawCardsOnScreen(cards: (Module | Event)[]): Group {
        let sceneWidth = this.width();
        let sceneHeight = this.height();

        let offset = new Vector2(0, 0);

        let maxCardSize = Math.min(sceneWidth, sceneHeight) * 0.75;
        let spaceAvailable = Math.max(sceneWidth, sceneHeight) * 0.75;
        let padding = 20;

        let cardSize = Math.min(maxCardSize, (spaceAvailable + padding) / cards.length - padding);

        if (sceneWidth > sceneHeight) {
            offset.x = cardSize + padding;
        } else {
            offset.y = cardSize + padding;
        }

        let cardShapes = new Group();

        let position = new Vector2(0, 0);

        for (let card of cards) {
            cardShapes.add(
                new Card({
                    x: position.x,
                    y: position.y,
                    size: cardSize,
                    card: card
                })
            );

            position.add(offset);
        }

        cardShapes
            .setPosition({
                x: (sceneWidth - cardShapes.getWidth()) / 2,
                y: (sceneHeight - cardShapes.getHeight()) / 2
            });

        return cardShapes;
    }

    async permuteCards(cards: (Event | Module)[]): Promise<number[]> {
        return await this.enqueueActivity(new PermuteCardsActivity(this, cards));
    }

    chooseModulesToMoveDamage(moveDamageReason: MoveDamageReason): Promise<{ from?: Vector2, to?: Vector2 }> {
        // TODO: maybe add a distinction
        const reasonStatus: Record<MoveDamageReason, string> = {
            [MoveDamageReason.MainModule]: "Выберите, откуда переместить урон",
            [MoveDamageReason.EventCard]: "Выберите, откуда переместить урон"
        }

        this.topBarDrawer.setStatus(reasonStatus[moveDamageReason]);

        return new Promise((resolve) => {
            let moveDamageFrom: Module;
            let moveDamageTo: Module;

            this.gameManager.spaceshipsScene.chooseModule((module?: Module) => {
                moveDamageFrom = module;
            }, (module?: Module, playerId?: number) => {
                return playerId === this.gameManager.currentPlayer.id
                    && module.health !== module.totalHealth;
            }, true, Color.fromHex('#a3b18a'));

            this.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    if (moveDamageFrom === undefined)
                        return;

                    this.gameManager.spaceshipsScene.endChoosingModule();
                    this.topBarDrawer.removeButtons();

                    this.topBarDrawer.setStatus("выберите, куда переместить урон");

                    this.gameManager.spaceshipsScene.chooseModule((module?: Module) => {
                        moveDamageTo = module;
                    }, (module?: Module, playerId?: number) => {
                        return playerId === this.gameManager.currentPlayer.id;
                    }, true, Color.fromHex('a3b18a'));

                    this.topBarDrawer.addButtons([{
                        text: "Далее",
                        color: COLORS.BUTTON.PRIMARY,
                        onClick: () => {
                            if (moveDamageTo === undefined)
                                return;

                            this.gameManager.spaceshipsScene.endChoosingModule();
                            this.topBarDrawer.removeButtons();

                            resolve({
                                from: new Vector2(moveDamageFrom.x, moveDamageFrom.y),
                                to: new Vector2(moveDamageTo.x, moveDamageTo.y)
                            });
                        }
                    }]);
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve({from: undefined, to: undefined});
                }
            }]);
        });
    }

    askYesOrNo(): Promise<boolean> {
        return new Promise((resolve) => {
            this.topBarDrawer.addButtons([{
                text: "Да",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.topBarDrawer.removeButtons();
                    this.topBarDrawer.clearStatus();
                    this.gameManager.spaceshipsScene.endChoosingModule();

                    resolve(true);
                }
            }, {
                text: "Нет",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.topBarDrawer.removeButtons();
                    this.topBarDrawer.clearStatus();
                    this.gameManager.spaceshipsScene.endChoosingModule();

                    resolve(false);
                }
            }]);
        });
    }
}
