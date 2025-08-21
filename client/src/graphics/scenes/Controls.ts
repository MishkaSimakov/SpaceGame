import ModuleCard from "@common/modules/ModuleCard";
import Vector2 from "@common/Vector2";
import {EventCard} from "@common/events/EventCard";
import {Message} from "@common/Types";

import Game from "../../Game";
import HandDrawer from "../HandDrawer";
import {COLORS} from "../constants";
import TopBarDrawer from "../topbar/TopBarDrawer";
import Scene from "../engine/Scene";
import {Group} from "../engine/Group";
import {Card} from "../shapes/Card";
import Color from "../Color";
import {Boundary, BoundaryType} from "../CountBoundary";

import {ShowCardsActivity} from "../activities/ShowCards";
import {Activity} from "../activities/Activity";
import {PermuteCardsActivity} from "../activities/PermuteCards";
import {ChooseFromListActivity} from "../activities/ChooseFromList";
import {ChooseCardsActivity} from "../activities/ChooseCards";

export default class Controls extends Scene {
    handDrawer: HandDrawer;
    topBarDrawer: TopBarDrawer;
    gameManager: Game;

    activitiesQueue: { activity: Activity, lock: Promise<void> }[] = [];

    constructor(game: Game) {
        super();

        this.gameManager = game;
    }

    adopted() {
        this.topBarDrawer = new TopBarDrawer(this);
        this.handDrawer = new HandDrawer(this.gameManager, this);
    }

    updateData(newMessages: Message[]) {
        this.handDrawer.setHandData(this.gameManager.currentPlayer.hand);
        this.handDrawer.redraw();

        this.topBarDrawer.setPlayersData(
            this.gameManager.currentPlayer,
            this.gameManager.otherPlayers,
            this.gameManager.onlineMap,
            this.gameManager.playerTime,
            newMessages
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
        let resolve;
        const lock = new Promise<void>(res => {
            resolve = res;
        });

        this.activitiesQueue.push({activity, lock});

        if (this.activitiesQueue.length > 1) {
            await this.activitiesQueue[this.activitiesQueue.length - 2].lock;
        }

        const result = await activity.activate();
        this.activitiesQueue.shift();

        // unlock execution of next activity
        resolve();

        return result;
    }

    async showCards(cards: (ModuleCard | EventCard)[], title?: string): Promise<void> {
        return await this.enqueueActivity(new ShowCardsActivity(this, cards, title));
    }

    async chooseFromList(title: string, values: string[]): Promise<number> {
        return await this.enqueueActivity(new ChooseFromListActivity(this, title, values));
    }

    async discardCards(requiredDiscardCount: number): Promise<number[]> {
        return await this.enqueueActivity(new ChooseCardsActivity(this, "Скиньте лишние карты", {
            type: BoundaryType.AT_LEAST,
            count: requiredDiscardCount
        }, this.gameManager.getCurrentPlayer().hand));
    }

    async chooseModulesToRepair(title: string, maxCount: number): Promise<Vector2[]> {
        const boundary = Boundary.noMoreThan(maxCount);

        this.topBarDrawer.setStatus(title);

        const handle = this.gameManager.spaceshipsScene.chooseModules(
            ({
                 module,
                 player
             }) => player === this.gameManager.getCurrentPlayer().id && module.health !== module.totalHealth,
            boundary,
            Color.fromHex('#a3b18a')
        );

        const validate = () => {
            this.topBarDrawer.setButtonDisabled(
                'repair',
                handle.get().length === 0 || handle.get().length > maxCount
            )
        };

        handle.onSet(validate);

        const positions = await new Promise<Vector2[]>((resolve) => {
            this.topBarDrawer.addButtons([{
                text: "Починить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(handle.get().map(i => Vector2.modulePosition(i.module)));
                },
                name: 'repair'
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve([]);
                }
            }]);

            validate();
        });

        this.topBarDrawer.removeButtons();
        this.topBarDrawer.clearStatus();
        this.gameManager.spaceshipsScene.endChoosingModule();

        return positions;
    }

    drawCardsOnScreen(cards: (ModuleCard | EventCard)[]): Group {
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

    async permuteCards(cards: (EventCard | ModuleCard)[]): Promise<number[]> {
        return await this.enqueueActivity(new PermuteCardsActivity(this, cards));
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
