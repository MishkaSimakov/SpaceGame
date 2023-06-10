import Module, {isModule} from "../../../../../common/modules/Module";
import HandDrawer from "../../HandDrawer";
import Vector2 from "../../../../../common/Vector2";
import {Event} from "../../../../../common/events/Event";
import {drawCard} from "../../CardsDrawer";
import TopBarDrawer from "../../topbar/TopBarDrawer";
import Game from "../../../Game";
import Modal from "../../Modal";
import {COLORS} from "../../constants";
import {AttackReason, MoveDamageReason} from "../../../../../common/Types";
import {OtherPlayer} from "../../../../../common/GameForPlayerDTO";
import TopBarSmallDrawer from "../../topbar/TopBarSmallDrawer";
import TopBarDefaultDrawer from "../../topbar/TopBarDefaultDrawer";


export default class Controls extends Phaser.Scene {
    handDrawer: HandDrawer;
    topBarDrawer: TopBarDrawer;
    gameManager: Game;

    showCardShapes: {
        cards?: Phaser.GameObjects.Container,
        title?: Phaser.GameObjects.Text,
        fade?: Phaser.GameObjects.Rectangle
    } = {};

    constructor(game: Game) {
        super({
            key: 'Controls',
            active: true
        });

        this.gameManager = game;
    }

    create() {
        this.handDrawer = new HandDrawer(this.gameManager, this);

        if (this.game.canvas.width < (400 + 2 * 15)) {
            this.topBarDrawer = new TopBarSmallDrawer(this);
        } else {
            this.topBarDrawer = new TopBarDefaultDrawer(this);
        }

        this.input.dragDistanceThreshold = 10;
    }

    redraw() {
        this.handDrawer.redraw();

        this.topBarDrawer.setPlayersData(this.gameManager.currentPlayer, this.gameManager.otherPlayers, this.gameManager.playerTime);
        this.topBarDrawer.setMessages(this.gameManager.messages);
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
                modal.addLine(player.name)
                    .setInteractive()
                    .on('pointerdown', () => {
                        resolve(player.id);

                        modal.destroy();
                    });
            }

            this.input.once('pointerup', () => {
                this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (!modal.backgroundShape.getBounds().contains(pointer.x, pointer.y)) {
                        this.input.removeListener("pointerdown");

                        resolve(undefined);

                        modal.destroy();
                    }
                });
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

            let sceneWidth = this.game.canvas.width;
            let sceneHeight = this.game.canvas.height;
            this.showCardShapes.cards = this.drawCardsOnScreen(cards);

            this.showCardShapes.fade = this.add.rectangle(0, 0, sceneWidth, sceneHeight, 0x000000, 0.75)
                .setOrigin(0, 0)
                .setDepth(19);

            if (title) {
                this.showCardShapes.title = this.add.text(
                    sceneWidth / 2, this.showCardShapes.cards.getBounds().top - 15,
                    title
                )
                    .setOrigin(0.5, 1)
                    .setStyle({
                        fontFamily: 'Exo2Bold',
                        fontSize: '20px'
                    })
                    .setDepth(20);
            }

            this.input.once('pointerdown', () => {
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
                modal.addLine(values[index])
                    .setInteractive()
                    .on('pointerdown', () => {
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
                let line = modal.addLine(isModule(card) ? (card as Module).name : 'event')
                    .setInteractive();

                line.on('pointerdown', () => {
                    if (selected.indexOf(parseInt(index)) !== -1) {
                        selected = selected.filter((s) => s !== parseInt(index));

                        line.setText(line.text.slice(2, -2));
                    } else {
                        selected.push(parseInt(index));

                        line.setText("- " + line.text + " -");
                    }
                });
            }

            modal.setBottomText("Скинуть")
                .setInteractive()
                .on('pointerdown', () => {
                    if (selected.length < requiredDiscardCount)
                        return;

                    resolve(selected);

                    modal.destroy();
                });
        });
    }

    chooseCards(cards: (Module | Event)[], count: number, title: string): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            let cardShapes: Phaser.GameObjects.Container;
            let backgroundShape: Phaser.GameObjects.Rectangle;
            let fadeShape: Phaser.GameObjects.Rectangle;
            let titleShape: Phaser.GameObjects.Text;
            let buttonShape: Phaser.GameObjects.Text;

            let selected: number[] = [];

            let offset = 20;
            let outlineColor = 0xa3b18a;

            let sceneWidth = this.game.canvas.width;
            let sceneHeight = this.game.canvas.height;
            cardShapes = this.drawCardsOnScreen(cards)
                .setDepth(21);

            fadeShape = this.add.rectangle(0, 0, sceneWidth, sceneHeight, 0x000000, 0.75)
                .setOrigin(0, 0)
                .setDepth(19);

            if (title) {
                titleShape = this.add.text(sceneWidth / 2, cardShapes.getBounds().top - 15, title)
                    .setOrigin(0.5, 1)
                    .setStyle({
                        fontFamily: 'Exo2Bold',
                        fontSize: '20px'
                    })
                    .setDepth(21);
            }

            buttonShape = this.add.text(sceneWidth / 2, cardShapes.getBounds().bottom + 15, "Далее")
                .setOrigin(0.5, 0)
                .setInteractive()
                .setDepth(21)
                .on('pointerdown', () => {
                    cardShapes.destroy();
                    backgroundShape.destroy();
                    fadeShape.destroy();
                    titleShape.destroy();
                    buttonShape.destroy();

                    resolve(selected);
                });

            let backgroundPosition1 = new Vector2(
                Math.min(cardShapes.getBounds().left, titleShape.getBounds().left) - offset,
                titleShape.getBounds().top - offset
            );
            let backgroundPosition2 = new Vector2(
                Math.max(cardShapes.getBounds().right, titleShape.getBounds().right) + offset,
                buttonShape.getBounds().bottom + offset
            );
            backgroundShape = this.add.rectangle(
                backgroundPosition1.x, backgroundPosition1.y,
                backgroundPosition2.x - backgroundPosition1.x,
                backgroundPosition2.y - backgroundPosition1.y,
                0x0B2545, 0.75
            )
                .setOrigin(0, 0)
                .setStrokeStyle(2, 0x3D76BE)
                .setDepth(20);

            cardShapes.getAll().forEach((shape: Phaser.GameObjects.Container, index: number) => {
                (shape.getAll()[0] as Phaser.GameObjects.Rectangle)
                    .setInteractive()
                    .on('pointerdown', () => {
                        if (selected.includes(index)) {
                            (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                            selected = selected.filter((s) => s != index);
                            return;
                        }

                        if (selected.length == count) {
                            (
                                (cardShapes.getAt(selected[count - 1]) as Phaser.GameObjects.Container)
                                    .getAll()[0] as Phaser.GameObjects.Rectangle
                            )
                                .setStrokeStyle(0);
                            selected[count - 1] = index;
                        } else {
                            selected.push(index);
                        }

                        (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, outlineColor);
                    });
            });
        });
    }

    drawCardsOnScreen(cards: (Module | Event)[]): Phaser.GameObjects.Container {
        let sceneWidth = this.game.canvas.width;
        let sceneHeight = this.game.canvas.height;

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

        let cardShapes = this.add.container();

        let position = new Vector2(0, 0)

        for (let card of cards) {
            cardShapes.add(drawCard(this, card, position, cardSize));

            position.add(offset);
        }

        cardShapes
            .setDepth(20)
            .setPosition(
                (sceneWidth - cardShapes.getBounds().width + cardSize) / 2,
                (sceneHeight - cardShapes.getBounds().height + cardSize) / 2
            );

        return cardShapes;
    }

    permuteCards(cards: (Event | Module)[]): Promise<number[]> {
        return new Promise((resolve) => {
                let outlineColor = 0xa3b18a;
                let cardShapes: Phaser.GameObjects.Container[] = [];
                let cardWidth = 256;

                let order: number[] = [];
                for (let i = 0; i < cards.length; ++i) {
                    order.push(i);
                }

                let backgroundShape = this.add.rectangle(
                    this.game.canvas.width / 2,
                    this.game.canvas.height / 2,
                    (cardWidth + 50) * cards.length, cardWidth + 100, 0x000000
                )
                    .setOrigin(0.5)
                    .setStrokeStyle(2, 0x555555)
                    .setDepth(2);

                let buttonShape = this.add.text(this.game.canvas.width / 2, this.game.canvas.height / 2 + cardWidth / 2 + 20, "Next")
                    .setInteractive()
                    .setDepth(3)
                    .on('pointerdown', () => {
                        backgroundShape.destroy();
                        for (let cardShape of cardShapes) {
                            cardShape.destroy();
                        }
                        buttonShape.destroy();

                        resolve(order);
                    });

                let indexByPosition = (x: number): number => {
                    let index = (x - (this.game.canvas.width / 2 - ((cardWidth + 50) * cards.length - 50) / 2 + cardWidth / 2)) / (cardWidth + 50);
                    index = Math.round(index);

                    index = Math.min(
                        order.length - 1,
                        Math.max(0, index)
                    );

                    return index;
                }

                for (let [indexInOrder, index] of order.entries()) {
                    let card = cards[index];

                    let position = new Vector2(
                        this.game.canvas.width / 2 - ((cardWidth + 50) * cards.length - 50) / 2 + (cardWidth + 50) * indexInOrder + cardWidth / 2,
                        this.game.canvas.height / 2
                    );

                    let cardShape = drawCard(this, card, position, cardWidth)
                        .setDepth(3)
                        .setInteractive();

                    this.input.setDraggable(cardShape, true);

                    cardShape.on('dragstart', () => {
                        this.children.bringToTop(cardShape);
                    })

                    cardShape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                        cardShape.setPosition(x, y);

                        let newIndexInOrder = indexByPosition(cardShape.x);

                        // because order could be updated
                        let oldIndexInOrder = order.indexOf(index);

                        if (newIndexInOrder !== oldIndexInOrder) {
                            order.splice(oldIndexInOrder, 1);
                            order.splice(newIndexInOrder, 0, index);

                            moveCards(index);
                        }
                    });

                    cardShape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                        moveCards();
                    });

                    cardShapes[index] = cardShape;
                }

                let moveCards = (except?: number) => {
                    for (let [indexInOrder, index] of order.entries()) {
                        if (index === except)
                            continue;

                        let cardShape = cardShapes[index];
                        let position = new Vector2(
                            this.game.canvas.width / 2 - ((cardWidth + 50) * cards.length - 50) / 2 + (cardWidth + 50) * indexInOrder + cardWidth / 2,
                            this.game.canvas.height / 2
                        );

                        cardShape.setPosition(position.x, position.y);
                    }
                }
            }
        );
    }

    chooseModulesToMoveDamage(moveDamageReason: MoveDamageReason): Promise<{ from: Vector2, to: Vector2 } | undefined> {
        let reasonStatus: Record<MoveDamageReason, string> = {
            [MoveDamageReason.MainModule]: "Используйте командный модуль, чтобы перенести урон",
            [MoveDamageReason.EventCard]: "Выберите модуль, с которого переместить урон"
        }

        this.topBarDrawer.setStatus(reasonStatus[moveDamageReason]);

        return new Promise((resolve) => {
            let moveDamageFrom: Module;
            let moveDamageTo: Module;

            this.gameManager.spaceshipsScene.chooseModule((module?: Module) => {
                moveDamageFrom = module;
            }, (module?: Module, playerId?: number) => {
                if (playerId !== this.gameManager.currentPlayer.id)
                    return false;

                if (!module.isDamaged())
                    return false;

                return true;
            }, true, 0xa3b18a);

            this.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    if (moveDamageFrom === undefined)
                        return;

                    this.gameManager.spaceshipsScene.endChoosingModule();
                    this.topBarDrawer.removeButtons();

                    this.topBarDrawer.setStatus("выберите модуль, на который переместить урон");

                    this.gameManager.spaceshipsScene.chooseModule((module?: Module) => {
                        moveDamageTo = module;
                    }, (module?: Module, playerId?: number) => {
                        return playerId === this.gameManager.currentPlayer.id;
                    }, true, 0xa3b18a);

                    this.topBarDrawer.addButtons([{
                        text: "Далее",
                        color: COLORS.BUTTON.PRIMARY,
                        onClick: () => {
                            if (moveDamageTo === undefined)
                                return;

                            this.gameManager.spaceshipsScene.endChoosingModule();
                            this.topBarDrawer.removeButtons();

                            resolve({
                                from: moveDamageFrom.getPosition(),
                                to: moveDamageTo.getPosition()
                            });
                        }
                    }]);
                }
            }, {
                text: "Пропустить",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    resolve(undefined);
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
