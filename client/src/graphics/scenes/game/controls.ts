import Module, {isModule} from "../../../../../common/modules/Module";
import HandDrawer from "../../HandDrawer";
import Vector2 from "../../../../../common/Vector2";
import Player from "../../../../../common/Player";
import {Event} from "../../../../../common/events/Event";
import {drawEventCard, drawModuleCard} from "../../CardsDrawer";
import TopBarDrawer from "../../TopBarDrawer";
import Game from "../../../Game";
import Modal from "../../Modal";
import {COLORS} from "../../constants";
import {AttackReason, MoveDamageReason} from "../../../../../common/Types";


export default class Controls extends Phaser.Scene {
    handDrawer: HandDrawer;
    topBarDrawer: TopBarDrawer;
    gameManager: Game;

    constructor(game: Game) {
        super({
            key: 'Controls',
            active: true
        });

        this.gameManager = game;
    }

    create() {
        this.handDrawer = new HandDrawer([], new Vector2(128, 128), this);
        this.topBarDrawer = new TopBarDrawer(this);

        this.input.dragDistanceThreshold = 10;
    }

    playersDataUpdated() {
        this.drawHand(this.getCurrentPlayer().hand);

        // this.topBarDrawer.drawPlayersList(this.gameManager.players, this.gameManager.link, (link: number) => {
        //     this.gameManager.spaceshipsScene.panToPlayerWithLink(link);
        // });
        this.topBarDrawer.setCharacteristics(this.getCurrentPlayer());
    }

    drawHand(hand: (Module | Event)[]) {
        this.handDrawer.hand = hand;

        this.handDrawer.draw();
    }

    rebuildSpaceship(): Promise<void> {
        return new Promise((resolve) => {
            this.topBarDrawer.setStatus("Перестрйка корабля");

            this.topBarDrawer.addButtons([{
                text: "Далее",
                color: COLORS.BUTTON.PRIMARY,
                onClick: () => {
                    this.topBarDrawer.removeButtons();

                    resolve();
                }
            }]);
        });
    }

    choosePlayerForAttack(players: Player[], attackReason: AttackReason) {
        let reasonStatus: Record<AttackReason, string> = {
            [AttackReason.AttackModule]: "Используйте абордажный модуль, чтобы напасть",
            [AttackReason.MainModule]: "Используйте командный модуль, чтобы напасть",
            [AttackReason.AttackAnyEventCard]: "Выберите игрока для нападения",
            [AttackReason.AttackLaterEventCard]: "Используйте карточку, чтобы напасть"
        }

        return new Promise((resolve: (link?: number) => void) => {
            this.topBarDrawer.setStatus(reasonStatus[attackReason]);

            let buttons = [{
                text: "Да",
                color: COLORS.BUTTON.DANGER,
                onClick: () => {
                    this.topBarDrawer.buttons.forEach((b) => b.background.disableInteractive());

                    this.showChoosePlayerForAttackModal(players).then((result?: number) => {
                        if (result !== undefined) {
                            this.topBarDrawer.removeButtons();
                            resolve(result);
                        }

                        this.topBarDrawer.buttons.forEach((b) => b.background.setInteractive());
                    });
                }
            }];

            if (attackReason != AttackReason.AttackAnyEventCard) {
                buttons.push({
                    text: "Нет",
                    color: COLORS.BUTTON.PRIMARY,
                    onClick: () => {
                        this.topBarDrawer.removeButtons();

                        resolve();
                    }
                });
            }

            this.topBarDrawer.addButtons(buttons);
        });
    }

    showChoosePlayerForAttackModal(players: Player[]): Promise<number | undefined> {
        return new Promise((resolve) => {
            let modal = new Modal(this);

            modal.setTitle("Выберите игрока для атаки");

            for (let player of players) {
                modal.addLine(player.link.toString())
                    .setInteractive()
                    .on('pointerdown', () => {
                        resolve(player.link);

                        modal.destroy();
                    });
            }

            this.input.once('pointerup', () => {
                this.input.once('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (!modal.backgroundShape.getBounds().contains(pointer.x, pointer.y)) {
                        resolve(undefined);

                        modal.destroy();
                    }
                });
            });
        });
    }

    askForRunaway() {
        return new Promise((resolve: (isRunningAway: boolean) => void, reject) => {
            let modal = new Modal(this);

            modal.setTitle("Will you runaway?");

            modal.addLine("No, I will turn my enemy into dust")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve(false);

                    modal.destroy();
                });

            modal.addLine("Yes, I think I will be turned into dust")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve(true);

                    modal.destroy();
                });
        });
    }

    showCard(card: Module | Event) {
        let image: Phaser.GameObjects.Container;

        if (isModule(card)) {
            image = drawModuleCard(this, card as Module, new Vector2(this.game.canvas.width / 2, this.game.canvas.height / 2));
        } else {
            image = drawEventCard(this, card as Event, new Vector2(this.game.canvas.width / 2, this.game.canvas.height / 2));
        }

        image.setScale(2);
        (image.getAll()[0] as Phaser.GameObjects.Rectangle).setInteractive().on('pointerdown', () => {
            image.destroy();
        });
    }

    // return index of chosen value
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

    chooseCardType(): Promise<string> {
        return new Promise(resolve => {
            let modal = new Modal(this);

            modal.setTitle("Выберите тип карты");

            modal.addLine("Карта строительства")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve("module");

                    modal.destroy();
                });

            modal.addLine("Карта действия")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve("event");

                    modal.destroy();
                });
        });
    }

    discardCards(requiredDiscardCount: number): Promise<number[]> {
        return new Promise(resolve => {
            let selected: number[] = [];

            let modal = new Modal(this);

            modal.setTitle("Choose cards to discard");

            for (let [index, card] of Object.entries(this.handDrawer.hand)) {
                let line = modal.addLine(isModule(card) ? (card as Module).name : 'event')
                    .setInteractive();

                line.on('pointerdown', () => {
                    if (selected.indexOf(parseInt(index)) !== -1) {
                        selected = selected.filter((s) => s !== parseInt(index));

                        line.setBackgroundColor('#000000');
                    } else {
                        selected.push(parseInt(index));

                        line.setBackgroundColor('#808080');
                    }
                });
            }

            modal.setBottomText("Discard")
                .setInteractive()
                .on('pointerdown', () => {
                    if (selected.length < requiredDiscardCount)
                        return;

                    resolve(selected);

                    modal.destroy();
                });
        });
    }

    chooseCards(cards: (Module | Event)[], count: number): Promise<number[]> {
        return new Promise<number[]>((resolve, reject) => {
            let outlineColor = 0xa3b18a;
            let cardShapes: Phaser.GameObjects.Container[] = [];
            let cardWidth = 256;

            let selected: number[] = [];

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

                    resolve(selected);
                });

            for (let [index, card] of cards.entries()) {
                let cardShape: Phaser.GameObjects.Container;
                let position = new Vector2(
                    this.game.canvas.width / 2 - ((cardWidth + 50) * cards.length - 50) / 2 + (cardWidth + 50) * index + cardWidth / 2,
                    this.game.canvas.height / 2
                );

                if (isModule(card)) {
                    cardShape = drawModuleCard(this, card as Module, position);
                } else {
                    cardShape = drawEventCard(this, card as Event, position);
                }

                cardShape.setDepth(3);

                (cardShape.getAll()[0] as Phaser.GameObjects.Rectangle).setInteractive().on('pointerdown', () => {
                    if (selected.includes(index)) {
                        (cardShape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                        selected = selected.filter((s) => s != index);
                        return;
                    }

                    if (selected.length == count) {
                        (cardShapes[selected[count - 1]].getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);
                        selected[count - 1] = index;
                    } else {
                        selected.push(index);
                    }

                    (cardShape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, outlineColor);
                });

                cardShapes.push(cardShape);
            }
        });
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

                    let cardShape: Phaser.GameObjects.Container;
                    let position = new Vector2(
                        this.game.canvas.width / 2 - ((cardWidth + 50) * cards.length - 50) / 2 + (cardWidth + 50) * indexInOrder + cardWidth / 2,
                        this.game.canvas.height / 2
                    );

                    if (isModule(card)) {
                        cardShape = drawModuleCard(this, card as Module, position);
                    } else {
                        cardShape = drawEventCard(this, card as Event, position);
                    }

                    cardShape.setDepth(3);
                    cardShape.setInteractive();
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
            }, (module?: Module, playerLink?: number) => {
                if (playerLink !== this.gameManager.link)
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

                    this.topBarDrawer.setStatus("Выберите модуль, на который переместить урон");

                    this.gameManager.spaceshipsScene.chooseModule((module?: Module) => {
                        moveDamageTo = module;
                    }, (module?: Module, playerLink?: number) => {
                        return playerLink === this.gameManager.link;
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

    getCurrentPlayer(): Player {
        return this.gameManager.getCurrentPlayer();
    }
}