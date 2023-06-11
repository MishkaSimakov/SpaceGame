import SpaceshipDrawer from "../SpaceshipDrawer";
import Vector2 from "../../../../common/Vector2";
import Module from "../../../../common/modules/Module";
import Game from "../../Game";
import Scene from "../engine/Scene";
import {GraphicsManager} from "../engine/GraphicsManager";
import Pointer from "../engine/Pointer";
import Container from "../engine/shapes/Container";
import Card from "../engine/shapes/Card";
import Color from "../engine/types/Color";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -2500)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Scene {
    spaceshipDrawers: Record<number, SpaceshipDrawer> = {};

    isDragging: boolean = false;
    gameManager: Game;

    spaceshipsCardSize: number;

    constructor(graphicsManager: GraphicsManager, game: Game) {
        super(graphicsManager);

        this.gameManager = game;

        // let pinch = new Pinch(this);

        this.spaceshipsCardSize = 256 * this.width / 1440;

        this.graphicsManager.events.on("pointermove", (pointer: Pointer) => {
            if (!pointer.isDown) return;

            if (this.isDragging) return;

            this.scrollX -= (pointer.x - pointer.prevX) / this.zoom;
            this.scrollY -= (pointer.y - pointer.prevY) / this.zoom;
        });

        // TODO: uncomment when finish zoom
        // this.input.on("wheel", (pointer, gameObjects, deltaX, deltaY) => {
        //     if (deltaY > 0) {
        //         let newZoom = this.cameras.main.zoom - .1;
        //         if (newZoom > 0.2) {
        //             this.cameras.main.zoom = newZoom;
        //         }
        //     }
        //
        //     if (deltaY < 0) {
        //         let newZoom = this.cameras.main.zoom + .1;
        //         if (newZoom < 1.3) {
        //             this.cameras.main.zoom = newZoom;
        //         }
        //     }
        // });

        // pinch.on('pinch', (pinch) => {
        //     this.cameras.main.zoom *= pinch.scaleFactor;
        // });
    }

    chooseModule(onSelected: (module?: Module, playerId?: number) => void, check: (module: Module, playerId: number) => boolean, required: boolean, outlineColor: Color): void {
        let selected: Card;

        for (let key in this.spaceshipDrawers) {
            let playerId = parseInt(key);

            for (let shape of this.spaceshipDrawers[playerId].moduleShapes) {
                shape.events.on('pointerdown', () => {
                    let module = shape.card as Module;

                    if (!check(module, playerId))
                        return;

                    if (selected !== undefined)
                        selected.setStrokeStyle(Color.BLACK, 0);

                    if (!required && shape === selected) {
                        selected = undefined;
                        onSelected();

                        return;
                    }

                    selected = shape;
                    selected.setStrokeStyle(outlineColor, 5);

                    onSelected(module, playerId);
                });
            }
        }
    }

    chooseModules(onSelected: (modules: Module[]) => void, check: (module: Module, playerId: number) => boolean, count: number, outlineColor: Color): void {
        let selected: Card[] = [];

        for (let key in this.spaceshipDrawers) {
            let playerId = parseInt(key);
            for (let shape of this.spaceshipDrawers[playerId].moduleShapes) {
                shape.events.on('pointerdown', () => {
                    let module = shape.card as Module;

                    if (!check(module, playerId))
                        return;

                    if (selected.includes(shape))
                        return;

                    if (selected.length === count) {
                        selected[selected.length - 1].setStrokeStyle(Color.BLACK, 0);
                        selected.splice(selected.length - 1, 1);
                    }

                    selected.push(shape);
                    shape.setStrokeStyle(outlineColor, 5);

                    onSelected(selected.map(s => s.card as Module));
                });
            }
        }
    }

    updateData() {
        let players = this.gameManager.getAllPlayers();

        for (let [index, player] of players.entries()) {
            if (this.spaceshipDrawers[player.id] === undefined) {
                const spaceshipPosition = spaceshipConfigurations[players.length - 1][index];

                this.spaceshipDrawers[player.id] = new SpaceshipDrawer(
                    player.spaceship, spaceshipPosition, this.spaceshipsCardSize, this
                );

                if (player.id === this.gameManager.currentPlayer.id) {
                    this.panToPlayerWithId(player.id, 0);
                }
            } else {
                this.spaceshipDrawers[player.id].spaceship = player.spaceship;
            }

            this.spaceshipDrawers[player.id].draw();
        }
    }

    endChoosingModule() {
        for (let spaceshipDrawer of Object.values(this.spaceshipDrawers)) {
            for (let shape of spaceshipDrawer.moduleShapes) {
                shape.setStrokeStyle(Color.BLACK, 0);

                // TODO: add remove listeners and uncomment
                // shape.removeAllListeners('pointerdown');
            }
        }
    }

    panToPlayerWithId(playerId: number, duration: number = 500) {
        let position = this.spaceshipDrawers[playerId].center;

        // TODO: make pan and uncomment
        // this.cameras.main.pan(position.x, position.y, duration, 'Sine.easeInOut');
    }
}
