import Module, {isModule} from "../../../common/modules/Module";
import HandDrawer from "../helpers/HandDrawer";
import Vector2 from "../../../common/Vector2";
import Player from "../../../common/Player";
import {Event} from "../../../common/events/Event";
import {drawEventCard, drawModuleCard} from "../helpers/CardsDrawer";

class Modal {
    scene: Phaser.Scene;

    backgroundShape: Phaser.GameObjects.Rectangle;
    titleShape: Phaser.GameObjects.Text;

    lines: Phaser.GameObjects.Text[] = [];
    bottomTextShape: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;

        this.backgroundShape = this.scene.add.rectangle(
            this.scene.game.canvas.width / 2,
            this.scene.game.canvas.height / 2,
            500, 500, 0x000000
        )
            .setOrigin(0.5)
            .setStrokeStyle(2, 0x555555)
            .setDepth(2);
    }

    setTitle(title: string): Phaser.GameObjects.Text {
        this.titleShape = this.scene.add.text(
            this.scene.game.canvas.width / 2 - 250 + 10,
            this.scene.game.canvas.height / 2 - 250 + 10,
            title
        )
            .setDepth(3);

        return this.titleShape;
    }

    addLine(text: string): Phaser.GameObjects.Text {
        this.lines.push(
            this.scene.add.text(
                this.scene.game.canvas.width / 2 - 250 + 10,
                this.scene.game.canvas.height / 2 - 250 + 10 + 20 + this.lines.length * 20,
                text
            )
                .setDepth(3)
        );

        return this.lines[this.lines.length - 1];
    }

    setBottomText(text: string): Phaser.GameObjects.Text {
        this.bottomTextShape = this.scene.add.text(
            this.scene.game.canvas.width / 2 - 250 + 10,
            this.scene.game.canvas.height / 2 + 250 - 10,
            text
        )
            .setOrigin(0, 1)
            .setDepth(3);

        return this.bottomTextShape;
    }

    destroy() {
        if (this.titleShape !== undefined)
            this.titleShape.destroy();

        for (let shape of this.lines) {
            shape.destroy();
        }

        this.backgroundShape.destroy();

        if (this.bottomTextShape !== undefined)
            this.bottomTextShape.destroy();
    }
}

export default class Controls extends Phaser.Scene {
    handDrawer: HandDrawer;
    energyText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    buttons: Phaser.GameObjects.Text[] = [];

    usersListText: Phaser.GameObjects.Text[] = [];

    constructor() {
        super({
            key: 'Controls',
            active: true
        });
    }

    // this.playersList.push(
    //     this.add.text(this.game.canvas.width - 250, 10 + parseInt(index) * 20, player.id)
    //         .setInteractive()
    //         .setScrollFactor(0)
    //         .on('pointerdown', () => {
    //             this.cameras.main.pan(spaceshipPosition.x, spaceshipPosition.y, 500, 'Sine.easeInOut');
    //         })
    // )

    drawHand(hand: (Module | Event)[]) {
        if (this.handDrawer === undefined) {
            this.handDrawer = new HandDrawer(hand, new Vector2(128, 128), this);
        } else {
            this.handDrawer.hand = hand;
        }

        this.handDrawer.draw();
    }

    drawStatusBar(player: Player) {
        this.setEnergy(player.energy);
    }

    setStatus(status: string) {
        if (this.statusText === undefined) {
            this.statusText = this.add.text(250, 10, status);
        } else {
            this.statusText.setText(status);
        }
    }

    setEnergy(energy: number) {
        if (this.energyText === undefined) {
            this.energyText = this.add.text(10, 10, `Energy: ${energy}`);
        } else {
            this.energyText.setText(`Energy: ${energy}`);
        }
    }

    addButton(text: string, onClick: () => void): void {
        this.buttons.push(
            this.add.text(500 + this.buttons.length * 50, 10, text)
                .setInteractive()
                .on('pointerdown', onClick)
        );
    }

    removeButtons() {
        for (let button of this.buttons)
            button.destroy();

        this.buttons = [];
    }

    choosePlayerForAttack(links: number[]) {
        return new Promise((resolve: (link?: number) => void, reject) => {
            let modal = new Modal(this);

            modal.setTitle("Do you want to fight with someone?");
            modal.setBottomText("No, I'm peaceful")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve();

                    modal.destroy();
                });

            for (let link of links) {
                modal.addLine(link.toString())
                    .setInteractive()
                    .on('pointerdown', () => {
                        resolve(link);

                        modal.destroy();
                    });
            }
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

    chooseCardType() {
        return new Promise(resolve => {
            let modal = new Modal(this);

            modal.setTitle("Choose card type");

            modal.addLine("Module")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve("module");

                    modal.destroy();
                });

            modal.addLine("Event")
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

    drawPlayersList(data: { link: number, online: boolean, isMe: boolean }[], onclick: (link: number) => void) {
        for (let text of this.usersListText)
            text.destroy();

        this.usersListText = [];

        data.sort((a, b) => {
            if (a.isMe)
                return -1;
            if (b.isMe)
                return 1;
            return 0;
        })

        this.usersListText.push(this.add.text(1000, 10, "Players:"));

        for (let index in data) {
            let player = data[index];

            let text: string = player.isMe ? "You" : player.link.toString();
            text += player.online ? "(online)" : "(offline)";

            this.usersListText.push(
                this.add.text(1000, 10 + (parseInt(index) + 1) * 25, text)
                    .setInteractive()
                    .on('pointerdown', () => onclick(player.link))
            );
        }
    }
}