import Module, {isModule} from "@common/modules/Module";
import Vector2 from "@common/Vector2";
import {Event} from "@common/events/Event";
import {AttackReason, MoveDamageReason} from "@common/Types";
import {OtherPlayer} from "@common/GameForPlayerDTO";

import Game from "../../Game";
import Modal from "../Modal";
import HandDrawer from "../HandDrawer";
import {COLORS} from "../constants";
import TopBarDrawer from "../topbar/TopBarDrawer";
import Scene from "../engine/Scene";
import {Text} from "../engine/shapes/Text";
import {Rectangle} from "../engine/shapes/Rectangle";
import {Group} from "../engine/Group";
import Color from "../Color";
import {Card} from "../shapes/Card";
import TopBarDefaultDrawer from "../topbar/TopBarDefaultDrawer";
import TopBarSmallDrawer from "../topbar/TopBarSmallDrawer";

export default class Controls extends Scene {
    handDrawer: HandDrawer;
    topBarDrawer: TopBarDrawer;
    gameManager: Game;

    showCardShapes: {
        cards?: Group,
        title?: Text,
        fade?: Rectangle
    } = {};

    constructor(game: Game) {
        super();

        this.gameManager = game;
    }

    adopted() {
        this.handDrawer = new HandDrawer(this.gameManager, this);

        if (this.width() < (400 + 2 * 15)) {
            this.topBarDrawer = new TopBarSmallDrawer(this);
        } else {
            this.topBarDrawer = new TopBarDefaultDrawer(this);
        }
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

    choosePlayerForAttack(players: OtherPlayer[], attackReason: AttackReason) {
        let reasonStatus: Record<AttackReason, string> = {
            [AttackReason.AttackModule]: "Используйте абордажный модуль, чтобы напасть",
            [AttackReason.MainModule]: "Используйте командный модуль, чтобы напасть",
            [AttackReason.AttackAnyEventCard]: "Выберите игрока для нападения",
            [AttackReason.AttackLaterEventCard]: "Используйте карточку, чтобы напасть",
            [AttackReason.UsingAttackModuleSecondTime]: "Выберите игрока для нападения"
        }

        return new Promise((resolve: (playerId?: number) => void) => {
            this.topBarDrawer.setStatus(reasonStatus[attackReason]);

            let showNoButton = attackReason != AttackReason.AttackAnyEventCard && attackReason != AttackReason.UsingAttackModuleSecondTime;

            let buttons = [{
                text: showNoButton ? "Да" : "Выбрать",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    this.topBarDrawer.setButtonsDisabled(true);

                    this.showChoosePlayerForAttackModal(players).then((playerId?: number) => {
                        if (playerId !== undefined) {
                            this.topBarDrawer.removeButtons();
                            this.topBarDrawer.clearStatus();

                            resolve(playerId);
                        }

                        this.topBarDrawer.setButtonsDisabled(false);
                    });
                }
            }];

            if (showNoButton) {
                buttons.push({
                    text: "Нет",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        this.topBarDrawer.removeButtons();
                        this.topBarDrawer.clearStatus();

                        resolve();
                    }
                });
            }

            this.topBarDrawer.addButtons(buttons);
        });
    }

    showChoosePlayerForAttackModal(players: OtherPlayer[]): Promise<number | undefined> {
        return new Promise((resolve) => {
            let modal = new Modal(this);

            modal.setTitle("Выберите игрока для атаки");

            for (let player of players) {
                modal.addLine(player.name).on('click', () => {
                    resolve(player.id);

                    modal.destroy();
                });
            }

            const graphics = this.getGraphics();

            graphics.on('pointerdown.modal', (evt) => {
                const pos = this.getRelativePointerPosition();

                if (!modal.backgroundShape.getClientRect().contains(pos)) {
                    graphics.off("pointerdown.modal");

                    resolve(undefined);

                    modal.destroy();
                }
            });
        });
    }

    showCards(cards: (Module | Event)[], title?: string): Promise<void> {
        return new Promise(resolve => {
            let destroyShowCards = () => {
                this.showCardShapes.title?.destroy();
                this.showCardShapes.fade?.destroy();
                this.showCardShapes.cards?.destroy();
            }

            destroyShowCards();

            let sceneWidth = this.width();
            let sceneHeight = this.height();

            this.showCardShapes.fade = this.createAndAdd.rectangle({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            this.showCardShapes.cards = this.drawCardsOnScreen(cards);
            this.add(this.showCardShapes.cards);

            if (title) {
                this.showCardShapes.title = this.createAndAdd.text({
                    x: sceneWidth / 2,
                    y: this.showCardShapes.cards.getClientRect().top - 15,
                    text: title,
                    originX: 0.5,
                    originY: 1,
                    fontFamily: "Exo2Bold",
                    fill: "white",
                    fontSize: 20,
                });
            }

            this.getGraphics().once('pointerdown', () => {
                destroyShowCards();

                resolve();
            });
        });
    }

    chooseFromList(title: string, values: string[]): Promise<number> {
        return new Promise(resolve => {
            let modal = new Modal(this);

            modal.setTitle(title);

            for (let index = 0; index < values.length; ++index) {
                modal.addLine(values[index]).once('pointerdown', () => {
                    resolve(index);

                    modal.destroy();
                });
            }
        });
    }

    discardCards(requiredDiscardCount: number): Promise<number[]> {
        return new Promise(resolve => {
            let selected: number[] = [];

            let modal = new Modal(this);

            modal.setTitle("Выберите, какие карты скинуть");

            for (let [index, card] of Object.entries(this.gameManager.getCurrentPlayer().hand)) {
                let line = modal.addLine(isModule(card) ? (card as Module).name : 'event');

                line.on('pointerdown', () => {
                    if (selected.indexOf(parseInt(index)) !== -1) {
                        selected = selected.filter((s) => s !== parseInt(index));

                        line.text(line.text().slice(2, -2));
                    } else {
                        selected.push(parseInt(index));

                        line.text("- " + line.text() + " -");
                    }
                });
            }

            modal.setBottomText("Скинуть").on('pointerdown', () => {
                if (selected.length < requiredDiscardCount)
                    return;

                resolve(selected);

                modal.destroy();
            });
        });
    }

    chooseCards(cards: (Module | Event)[], count: number, title: string): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            let cardShapes: Group;
            let backgroundShape: Rectangle;
            let fadeShape: Rectangle;
            let titleShape: Text;
            let buttonShape: Text;

            let selected: number[] = [];

            let offset = 20;
            let outlineColor = '#a3b18a';

            let sceneWidth = this.width();
            let sceneHeight = this.height();

            cardShapes = this.drawCardsOnScreen(cards);

            fadeShape = this.createAndAdd.rectangle({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            if (title) {
                titleShape = new Text({
                    x: sceneWidth / 2,
                    y: cardShapes.getClientRect().top - 15,
                    text: title,
                    originX: 0.5,
                    originY: 1,
                    fill: "white",
                    fontFamily: "Exo2Bold",
                    fontSize: 20
                });
            }

            buttonShape = new Text({
                x: sceneWidth / 2,
                y: cardShapes.getClientRect().bottom + 15,
                text: "Далее",
                fill: "white",
                fontFamily: "Exo2Bold",
                originX: 0.5
            })
                .on('pointerdown', () => {
                    cardShapes.destroy();
                    backgroundShape.destroy();
                    fadeShape.destroy();
                    titleShape.destroy();
                    buttonShape.destroy();

                    resolve(selected);
                });

            let backgroundPosition1 = new Vector2(
                Math.min(cardShapes.getClientRect().left, titleShape.getClientRect().left) - offset,
                titleShape.getClientRect().top - offset
            );
            let backgroundPosition2 = new Vector2(
                Math.max(cardShapes.getClientRect().right, titleShape.getClientRect().right) + offset,
                buttonShape.getClientRect().bottom + offset
            );
            backgroundShape = this.createAndAdd.rectangle({
                x: backgroundPosition1.x,
                y: backgroundPosition1.y,
                width: backgroundPosition2.x - backgroundPosition1.x,
                height: backgroundPosition2.y - backgroundPosition1.y,
                fill: Color.fromHex('#0B2545', 0.75).toString(),
                stroke: Color.fromHex('#3D76BE').toString(),
                strokeWidth: 2
            });

            this.add(titleShape, buttonShape, cardShapes);

            cardShapes.children.forEach((shape, index) => {
                let card = shape as Card;

                card.on('click', () => {
                    if (selected.includes(index)) {
                        card.strokeWidth(0);

                        selected = selected.filter((s) => s != index);
                        return;
                    }

                    if (selected.length == count) {
                        (cardShapes.children[selected[count - 1]] as Card).strokeWidth(0);

                        selected[count - 1] = index;
                    } else {
                        selected.push(index);
                    }

                    card.strokeWidth(5).stroke(outlineColor);
                });
            });
        });
    }

    getCardIndexByPosition(cardsLength: number, x: number, y: number) {
        let sceneWidth = this.width();
        let sceneHeight = this.height();

        let maxCardSize = Math.min(sceneWidth, sceneHeight) * 0.75;
        let spaceAvailable = Math.max(sceneWidth, sceneHeight) * 0.75;
        let padding = 20;

        let cardSize = Math.min(maxCardSize, (spaceAvailable + padding) / cardsLength - padding);

        const clamp = (x, min, max) => {
            return Math.min(Math.max(x, min), max);
        }

        if (sceneWidth > sceneHeight) {
            return clamp(
                Math.floor(x / (cardSize + padding)),
                0,
                cardsLength
            );
        } else {
            return clamp(
                Math.floor(y / (cardSize + padding)),
                0,
                cardsLength
            )
        }
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

    permuteCards(cards: (Event | Module)[]): Promise<number[]> {
        return new Promise((resolve) => {
            const permuteCardsModal = new Group({
                visible: false,
                interactive: false
            });

            this.topBarDrawer.addButtons([{
                text: "Переставить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.topBarDrawer.setButtonsDisabled(true);

                    permuteCardsModal
                        .visible(true)
                        .interactive(true);
                }
            }]);

            let offset = 20;
            let sceneWidth = this.width();
            let sceneHeight = this.height();

            let cardShapes = this.drawCardsOnScreen(cards);

            const cardPositions = cardShapes.children.map(card => {
                return card.getPosition();
            });

            let order: number[] = [];
            for (let i = 0; i < cards.length; ++i) {
                order.push(i);
            }

            let fade = this.createAndAdd.rectangle({
                x: 0,
                y: 0,
                width: sceneWidth,
                height: sceneHeight,
                fill: Color.fromHex('#000000', 0.75).toString()
            });

            let horizontal = sceneWidth > sceneHeight;
            let titleShape = new Text({
                x: horizontal
                    ? cardShapes.getClientRect().left
                    : sceneWidth / 2,
                y: cardShapes.getClientRect().top - 15,
                text: "Верх колоды",
                originX: horizontal ? 0 : 0.5,
                originY: 1,
                fill: "white",
                fontFamily: "Exo2Bold",
                fontSize: 20,
            });

            let buttonShape = new Text({
                x: this.width() / 2,
                y: cardShapes.getClientRect().bottom + 15,
                text: "Далее",
                fill: "white",
                fontFamily: "Exo2Bold",
                originX: 0.5
            })
                .on('click', () => {
                    permuteCardsModal.destroy();
                    this.topBarDrawer.removeButtons();

                    resolve(order);
                });

            let backgroundPosition1 = new Vector2(
                Math.min(cardShapes.getClientRect().left, titleShape.getClientRect().left) - offset,
                titleShape.getClientRect().top - offset
            );
            let backgroundPosition2 = new Vector2(
                Math.max(cardShapes.getClientRect().right, titleShape.getClientRect().right) + offset,
                buttonShape.getClientRect().bottom + offset
            );
            let backgroundShape = this.createAndAdd.rectangle({
                x: backgroundPosition1.x,
                y: backgroundPosition1.y,
                width: backgroundPosition2.x - backgroundPosition1.x,
                height: backgroundPosition2.y - backgroundPosition1.y,
                fill: Color.fromHex('#0B2545', 0.75).toString(),
                stroke: Color.fromHex('#3D76BE').toString(),
                strokeWidth: 2
            });

            //

            for (let [indexInOrder, index] of order.entries()) {
                let cardShape = cardShapes.children[indexInOrder];

                cardShape.draggable(true);
                cardShape.on('dragstart', () => {
                    cardShape.moveToTop();
                });

                cardShape.on('dragmove', () => {
                    const pos = cardShapes.getRelativePointerPosition();
                    let newIndexInOrder = this.getCardIndexByPosition(cards.length, pos.x, pos.y);

                    // because order could be updated
                    let oldIndexInOrder = order.indexOf(index);

                    if (newIndexInOrder !== oldIndexInOrder) {
                        order.splice(oldIndexInOrder, 1);
                        order.splice(newIndexInOrder, 0, index);

                        moveCards(index);
                    }
                });

                cardShape.on('dragend', () => {
                    moveCards();
                });

                cardShapes[index] = cardShape;
            }

            permuteCardsModal.add(fade, backgroundShape, titleShape, buttonShape, cardShapes);
            this.add(permuteCardsModal);

            let moveCards = (except?: number) => {
                for (let [indexInOrder, index] of order.entries()) {
                    if (index === except)
                        continue;

                    let cardShape = cardShapes[index];
                    let position = cardPositions[indexInOrder];

                    cardShape.setPosition(position);
                }
            }

            fade.on('click', () => {
                if (permuteCardsModal.visible()) {
                    permuteCardsModal
                        .visible(false)
                        .interactive(false);

                    this.topBarDrawer.setButtonsDisabled(false);
                }
            });
        });
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
