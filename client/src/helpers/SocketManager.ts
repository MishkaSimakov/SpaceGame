import Game from "../scenes/game";
import Controls from "../scenes/controls";
import io, {Socket} from "socket.io-client";
import Player from "../../../common/Player";
import {plainToClass} from "../../../common/PlainToClass";
import SpaceshipDrawer from "./SpaceshipDrawer";
import Vector2 from "../../../common/Vector2";
import HandDrawer from "./HandDrawer";
import DragManager from "./DragManager";
import Module, {ModuleTypes} from "../../../common/modules/Module";

export default class SocketManager {
    game: Game;
    controls: Controls;
    socket: Socket;

    player: Player;
    otherPlayers: Record<string, Player>;

    constructor(game: Game, controls: Controls) {
        this.game = game;
        this.controls = controls;

        this.initSocket('http://localhost:3000')
    }

    initSocket(uri: string) {
        this.socket = io(uri);

        this.socket.on('connect', () => {
            console.log('connected!');
        });

        this.socket.on('setPlayersData', (players: { [index: string]: Player }) => {
            for (let [index, key] of Object.entries(Object.keys(players))) {
                let player = plainToClass(players[key], Player.getPropertiesMap());

                if (key === this.socket.id) {
                    this.player = player;
                } else {
                    this.otherPlayers[key] = player;
                }

                this.game.drawSpaceshipOf(player, parseInt(index), Object.keys(players).length);
            }

            this.controls.drawHand(this.player.hand);
            this.controls.drawStatusBar(this.player);
        });

        this.socket.on('startTurn', (player: Player, callback: (Player) => void) => {
            this.controls.setStatus("Your turn");
            this.controls.setEnergy(this.player.energy);

            this.setRebuildSpaceshipAllowed(true);

            this.controls.addButton("End rebuild", () => {
                this.controls.removeButtons();

                this.setRebuildSpaceshipAllowed(false);

                callback(this.player);
            });
        });

        this.socket.on('willYouFight', (callback) => {
            let otherPlayersNames: string[] = [];

            for (let [id, player] of Object.entries(this.otherPlayers))
                otherPlayersNames.push(player.id);

            this.controls.choosePlayerForAttack(otherPlayersNames).then((id?: string) => {
                callback({
                    attackedPlayerId: id
                });
            });
        })

        this.socket.on('chooseProtectors', (callback: (response: { protector?: [number, number] }) => void) => {
            let selectedProtector: Phaser.GameObjects.Container;

            this.controls.setStatus("Select protector");
            this.controls.addButton("Next", )
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

        this.socket.on('willYouRunaway', (callback: (response: { tryToRunaway: boolean }) => void) => {
            callback({
                tryToRunaway: confirm("Will you runaway?")
            });
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
    }

    setRebuildSpaceshipAllowed(allowed: boolean): void {

    }
}