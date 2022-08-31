import Module from "../../../common/modules/Module";
import HandDrawer from "../helpers/HandDrawer";
import Vector2 from "../../../common/Vector2";
import Player from "../../../common/Player";

export default class Controls extends Phaser.Scene {
    handDrawer: HandDrawer;
    energyText: Phaser.GameObjects.Text;
    statusText: Phaser.GameObjects.Text;
    buttons: Phaser.GameObjects.Text[];

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

    drawHand(hand: Module[]) {
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
        console.log("here");

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
        return new Promise(function (resolve: (player?: string) => void, reject) {
            let modalRect = this.add.rectangle(this.game.canvas.width / 2, this.game.canvas.height / 2, 500, 500, 0x000000)
                .setOrigin(0.5)
                .setStrokeStyle(2, 0x555555)
                .setDepth(2)
                .setScrollFactor(0);

            let title = this.add.text(this.game.canvas.width / 2 - 250 + 10, this.game.canvas.height / 2 - 250 + 10, "Do you want to fight with someone?")
                .setScrollFactor(0)
                .setDepth(3);

            let close_text = this.add.text(this.game.canvas.width / 2 - 250 + 10, this.game.canvas.height / 2 + 250 - 10, "No, I'm peaceful")
                .setOrigin(0, 1)
                .setInteractive()
                .on('pointerdown', () => {
                    resolve();
                });

            let list = [];

            for (let index in players) {
                list.push(
                    this.add.text(this.game.canvas.width / 2 - 250 + 10, this.game.canvas.height / 2 - 250 + 10 + 20 + parseInt(index) * 20, players[index])
                        .setInteractive()
                        .on('pointerdown', () => {
                            resolve(players[index]);

                            deleteInterface();
                        })
                );
            }

            let deleteInterface = () => {
                modalRect.destroy();
                title.destroy();
                list.forEach(s => s.destroy());
                close_text.destroy();
            };
        });
    }
}