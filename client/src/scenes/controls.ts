import Module, {isModule} from "../../../common/modules/Module";
import HandDrawer from "../helpers/HandDrawer";
import Vector2 from "../../../common/Vector2";
import Player from "../../../common/Player";
import {Event} from "../../../common/events/Event";
import {drawEventCard, drawModuleCard} from "../helpers/cards/CardsDrawer";

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

    bus: Phaser.Events.EventEmitter;

    constructor(bus: Phaser.Events.EventEmitter) {
        super({
            key: 'Controls',
            active: true
        });

        this.bus = bus;
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

    choosePlayerForAttack(players: string[]) {
        return new Promise((resolve: (player?: string) => void, reject) => {
            let modal = new Modal(this);

            modal.setTitle("Do you want to fight with someone?");
            modal.setBottomText("No, I'm peaceful")
                .setInteractive()
                .on('pointerdown', () => {
                    resolve();

                    modal.destroy();
                });

            for (let index in players) {
                modal.addLine(players[index])
                    .setInteractive()
                    .on('pointerdown', () => {
                        resolve(players[index]);

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
}