import Player from "../../../../../common/Player";
import SpaceshipDrawer from "../../SpaceshipDrawer";
import Vector2 from "../../../../../common/Vector2";
import Module from "../../../../../common/modules/Module";
import Game from "../../../Game";
import {Pinch} from 'phaser3-rex-plugins/plugins/gestures.js';
import config from "../../../config";
import Spaceship from "../../../../../common/Spaceship";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -2500)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Phaser.Scene {
    spaceshipDrawers: Record<number, SpaceshipDrawer> = {};

    isDragging: boolean = false;
    gameManager: Game;

    spaceshipsCardSize: number;

    constructor(game: Game) {
        super({
            key: 'Spaceships',
            active: true
        });

        this.gameManager = game;
    }

    preload() {
        // this.load.atlas('modules', '/spaceships/assets/modules-half.png', '/spaceships/assets/modules-atlas.json');
    }

    create() {
        let pinch = new Pinch(this);

        this.spaceshipsCardSize = 256 * this.game.canvas.width / 1440;

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            if (this.isDragging) return;

            let cam = this.cameras.main;

            cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
            cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
        });

        this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
            if (deltaY > 0) {
                let newZoom = this.cameras.main.zoom - .1;
                if (newZoom > 0.2) {
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

        pinch.on('pinch', (pinch) => {
            this.cameras.main.zoom *= pinch.scaleFactor;
        });
    }

    chooseModule(onSelected: (module?: Module, playerId?: number) => void, check: (module: Module, playerId: number) => boolean, required: boolean, outlineColor: number): void {
        let selected: Phaser.GameObjects.Container;

        for (let key in this.spaceshipDrawers) {
            let playerId = parseInt(key);

            for (let shape of this.spaceshipDrawers[playerId].moduleShapes) {
                shape.on('pointerdown', () => {
                    let module = shape.getData('module') as Module;

                    if (!check(module, playerId))
                        return;

                    if (selected !== undefined)
                        (selected.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                    if (!required && shape === selected) {
                        selected = undefined;
                        onSelected();

                        return;
                    }

                    selected = shape;
                    (selected.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, outlineColor);

                    onSelected(module, playerId);
                });
            }
        }
    }

    chooseModules(onSelected: (modules: Module[]) => void, check: (module: Module, playerId: number) => boolean, count: number, outlineColor: number): void {
        let selected: Phaser.GameObjects.Container[] = [];

        for (let key in this.spaceshipDrawers) {
            let playerId = parseInt(key);
            for (let shape of this.spaceshipDrawers[playerId].moduleShapes) {
                shape.on('pointerdown', () => {
                    let module = shape.getData('module') as Module;

                    if (!check(module, playerId))
                        return;

                    if (selected.includes(shape))
                        return;

                    if (selected.length === count) {
                        (selected[selected.length - 1].getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);
                        selected.splice(selected.length - 1, 1);
                    }

                    selected.push(shape);
                    (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, outlineColor);

                    onSelected(selected.map(s => s.getData('module') as Module));
                });
            }
        }
    }

    redraw() {
        let players = this.gameManager.getAllPlayers();

        for (let [index, player] of players.entries()) {
            if (this.spaceshipDrawers[player.id] === undefined) {
                const spaceshipPosition = spaceshipConfigurations[players.length - 1][index];

                this.spaceshipDrawers[player.id] = new SpaceshipDrawer(
                    player.spaceship, spaceshipPosition, this.spaceshipsCardSize, this
                );
            } else {
                this.spaceshipDrawers[player.id].spaceship = player.spaceship;
            }

            this.spaceshipDrawers[player.id].draw();
        }
    }

    endChoosingModule() {
        for (let spaceshipDrawer of Object.values(this.spaceshipDrawers)) {
            for (let shape of spaceshipDrawer.moduleShapes) {
                (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                shape.removeAllListeners('pointerdown');
            }
        }
    }

    panToPlayerWithId(playerId: number, duration: number = 500) {
        let position = this.spaceshipDrawers[playerId].center;

        this.cameras.main.pan(position.x, position.y, duration, 'Sine.easeInOut');
    }
}
