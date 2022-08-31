import io, {Socket} from 'socket.io-client';
import Player from "../../../common/Player";
import SpaceshipDrawer from "../helpers/SpaceshipDrawer";
import Vector2 from "../../../common/Vector2";
import HandDrawer from "../helpers/HandDrawer";
import DragManager from "../helpers/DragManager";
import {plainToClass} from "../../../common/PlainToClass";
import Module, {ModuleTypes} from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -1000)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)]
];

function isEmpty(obj) {
    return Object.keys(obj).length === 0;
}

export default class Game extends Phaser.Scene {
    full_scale = 0.75;
    hand_scale = 0.5;

    dragManager: DragManager;
    spaceshipDrawers: Record<string, SpaceshipDrawer> = {};

    endSpaceshipRebuildButton: Phaser.GameObjects.Text;

    constructor() {
        super({
            key: 'Game',
            active: true
        });
    }

    create() {
        // this.dragManager = new DragManager(this.spaceshipDrawers[this.player.id], this.handDrawer, this);
        // this.dragManager.setupEvents();

        this.socket.on('startTurn', (player: Player, callback: (Player) => void) => {
            this.setPlayer(plainToClass(player, Player.getPropertiesMap()));

            this.energyIndicator.setText("Energy: " + this.player.energy);

            this.endSpaceshipRebuildButton = this.add.text(500, 10, "End rebuild")
                .setDepth(1)
                .setInteractive()
                .on('pointerdown', () => {
                    this.endSpaceshipRebuildButton.destroy();

                    this.spaceshipDrawers[this.player.id].disallowDrag();
                    this.handDrawer.disallowDrag();

                    callback(this.player);
                });
            this.endSpaceshipRebuildButton.setScrollFactor(0);

            this.spaceshipDrawers[this.player.id].draw();
            this.handDrawer.draw();

            this.dragManager.setupEvents();

            this.spaceshipDrawers[this.player.id].allowDrag();
            this.handDrawer.allowDrag();
        });

        // this.socket.on('askForAttack', (callback) => {
        //     let modalRect = this.add.rectangle(this.game.canvas.width / 2, this.game.canvas.height / 2, 500, 500, 0x000000)
        //         .setOrigin(0.5)
        //         .setStrokeStyle(2, 0x555555)
        //         .setDepth(2)
        //         .setScrollFactor(0);
        //
        //     let title = this.add.text(this.game.canvas.width / 2 - 250 + 10, this.game.canvas.height / 2 - 250 + 10, "Do you want to fight with someone?")
        //         .setScrollFactor(0)
        //         .setDepth(3);
        //
        //     let close_text = this.add.text(this.game.canvas.width / 2 - 250 + 10, this.game.canvas.height / 2 + 250 - 10, "No, I'm peaceful")
        //         .setOrigin(0, 1)
        //         .setScrollFactor(0)
        //         .setDepth(3)
        //         .setInteractive()
        //         .on('pointerdown', () => {
        //             callback({});
        //
        //             modalRect.destroy();
        //             title.destroy();
        //             list.forEach(s => s.destroy());
        //             close_text.destroy();
        //         });
        //
        //     let list = [];
        //
        //     for (let [index, key] of Object.entries(Object.keys(this.otherPlayers))) {
        //         list.push(
        //             this.add.text(this.game.canvas.width / 2 - 250 + 10, this.game.canvas.height / 2 - 250 + 10 + 20 + parseInt(index) * 20, key)
        //                 .setScrollFactor(0)
        //                 .setDepth(3)
        //                 .setInteractive()
        //                 .on('pointerdown', () => {
        //                     callback({
        //                         attackedPlayerId: key
        //                     });
        //
        //                     modalRect.destroy();
        //                     title.destroy();
        //                     list.forEach(s => s.destroy());
        //                     close_text.destroy();
        //                 })
        //         );
        //     }
        // })

        this.socket.on('chooseProtectors', (callback: (response: { protector?: [number, number] }) => void) => {
            let selectedProtector: Phaser.GameObjects.Container;

            let helpText = this.add.text(500, 10, "Select protector")
                .setDepth(1)
                .setScrollFactor(0);

            let nextButton = this.add.text(750, 10, "Next")
                .setDepth(1)
                .setScrollFactor(0)
                .setInteractive()
                .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (selectedProtector === undefined) {
                        callback({});
                    } else {
                        let protector: Module = selectedProtector.getData('module');

                        callback({
                            protector: [protector.x, protector.y]
                        });
                    }

                    helpText.destroy();
                    nextButton.destroy();

                    for (let shape of this.spaceshipDrawers[this.player.id].moduleShapes) {
                        shape.removeAllListeners('pointerdown');
                    }
                });

            for (let shape of this.spaceshipDrawers[this.player.id].moduleShapes) {
                shape.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (shape.getData('module').type !== ModuleTypes.SmallQuantumProtector && shape.getData('module').type !== ModuleTypes.QuantumProtector)
                        return;

                    if (selectedProtector !== undefined)
                        (selectedProtector.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                    if (selectedProtector === shape) {
                        selectedProtector = undefined;
                        return;
                    }

                    selectedProtector = shape;
                    (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, 0xa3b18a);
                });
            }
        });

        this.socket.on('chooseWeaponAndTarget', (targetPlayerId: string, callback: (response: { weapon: [number, number], target: [number, number] }) => void) => {
            let selectedWeapon: Phaser.GameObjects.Container;
            let selectedTarget: Phaser.GameObjects.Container;

            let helpText = this.add.text(500, 10, "Choose weapon and target")
                .setDepth(1)
                .setScrollFactor(0);

            let nextButton = this.add.text(750, 10, "Next")
                .setDepth(1)
                .setScrollFactor(0)
                .setInteractive()
                .on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    if (selectedWeapon === undefined && selectedTarget === undefined)
                        return;

                    let weapon: Module = selectedWeapon.getData('module');
                    let target: Module = selectedTarget.getData('module');

                    callback({
                        weapon: [weapon.x, weapon.y],
                        target: [target.x, target.y]
                    });

                    helpText.destroy();
                    nextButton.destroy();

                    for (let [id, spaceshipDrawer] of Object.entries(this.spaceshipDrawers)) {
                        for (let shape of spaceshipDrawer.moduleShapes) {
                            shape.removeAllListeners('pointerdown');
                        }
                    }
                });

            for (let [id, spaceshipDrawer] of Object.entries(this.spaceshipDrawers)) {
                if (id !== this.player.id && id !== targetPlayerId)
                    continue;

                for (let shape of spaceshipDrawer.moduleShapes) {
                    shape.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                        if (id === this.player.id) {
                            if (shape.getData('module').strength === 0)
                                return;

                            if (selectedWeapon !== undefined)
                                (selectedWeapon.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                            selectedWeapon = shape;
                            (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, 0xa3b18a);
                        } else {
                            if (selectedTarget !== undefined)
                                (selectedTarget.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                            selectedTarget = shape;
                            (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, 0xe76f51);
                        }
                    });
                }
            }
        });

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            if (this.dragManager.isDragging) return;

            let cam = this.cameras.main;

            cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
            cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
        });

        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY, deltaZ) => {

            if (deltaY > 0) {
                let newZoom = this.cameras.main.zoom - .1;
                if (newZoom > 0.3) {
                    this.cameras.main.zoom = newZoom;
                }
            }

            if (deltaY < 0) {
                let newZoom = this.cameras.main.zoom + .1;
                if (newZoom < 1.3) {
                    this.cameras.main.zoom = newZoom;
                }
            }
        });
    }

    drawSpaceshipOf(player: Player, index: number, count: number): void {
        if (this.spaceshipDrawers[player.id] !== undefined) {
            const spaceshipPosition = spaceshipConfigurations[count - 1][index];

            this.spaceshipDrawers[player.id] = new SpaceshipDrawer(
                player.spaceship,
                spaceshipPosition,
                new Vector2(256, 256),
                this
            );
        } else {
            this.spaceshipDrawers[player.id].spaceship = player.spaceship;
        }

        this.spaceshipDrawers[player.id].draw();
    }
}