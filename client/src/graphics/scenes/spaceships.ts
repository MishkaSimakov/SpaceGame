import SpaceshipDrawer from "../SpaceshipDrawer";
import Vector2 from "../../../../common/Vector2";
import Module from "../../../../common/modules/Module";
import Game from "../../Game";
import Scene from "../engine/Scene";
import Color from "../Color";
import {DD} from "../engine/Drag";


let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -2500)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Scene {
    spaceshipDrawers: Record<number, SpaceshipDrawer> = {};

    gameManager: Game;

    spaceshipsCardSize: number;

    constructor(game: Game) {
        super({
            clearColor: "black",
            originX: -0.5,
            originY: -0.5
        });

        this.gameManager = game;
    }

    adopted() {
        // let pinch = new Pinch(this);

        this.spaceshipsCardSize = 256 * this.width() / 1440;
        let prevPointerPosition = this.getGraphics().getPointerPosition();

        this.getGraphics().on("pointermove", ({evt}) => {
            let pointerPosition = this.getGraphics().getPointerPosition();

            if (DD.isDragging()) return;

            if (evt.buttons !== 0) {
                let zoom = this.scaleX(),
                    x = this.x(),
                    y = this.y();

                this.x(x + (pointerPosition.x - prevPointerPosition.x));
                this.y(y + (pointerPosition.y - prevPointerPosition.y));
            }

            prevPointerPosition = pointerPosition;
        });

        this.getGraphics().on("wheel", ({evt}) => {
            let deltaY = evt.deltaY,
                zoom = this.scaleX(),
                newZoom = zoom,
                pos = this.getGraphics().getPointerPosition();

            if (deltaY > 0) {
                newZoom = Math.max(0.2, zoom - 0.1);
            }

            if (deltaY < 0) {
                newZoom = Math.min(1.3, zoom + .1);
            }

            // TODO: zoom into cursor
            // let offsetX = pos.x * (zoom - newZoom),
            //     offsetY = pos.y * (zoom - newZoom);
            // this.move(offsetX, offsetY);

            this.scaleX(newZoom).scaleY(newZoom);
        });

        // pinch.on('pinch', (pinch) => {
        //     this.cameras.main.zoom *= pinch.scaleFactor;
        // });
    }

    chooseModule(onSelected: (module?: Module, playerId?: number) => void, check: (module: Module, playerId: number) => boolean, required: boolean, outlineColor: Color): void {
        // let selected: Card;
        //
        // for (let key in this.spaceshipDrawers) {
        //     let playerId = parseInt(key);
        //
        //     for (let shape of this.spaceshipDrawers[playerId].moduleShapes) {
        //         shape.events.on('pointerdown', () => {
        //             let module = shape.card as Module;
        //
        //             if (!check(module, playerId))
        //                 return;
        //
        //             if (selected !== undefined)
        //                 selected.setStrokeStyle(Color.BLACK, 0);
        //
        //             if (!required && shape === selected) {
        //                 selected = undefined;
        //                 onSelected();
        //
        //                 return;
        //             }
        //
        //             selected = shape;
        //             selected.setStrokeStyle(outlineColor, 5);
        //
        //             onSelected(module, playerId);
        //         });
        //     }
        // }
    }

    chooseModules(onSelected: (modules: Module[]) => void, check: (module: Module, playerId: number) => boolean, count: number, outlineColor: Color): void {
        // let selected: Card[] = [];
        //
        // for (let key in this.spaceshipDrawers) {
        //     let playerId = parseInt(key);
        //     for (let shape of this.spaceshipDrawers[playerId].moduleShapes) {
        //         shape.events.on('pointerdown', () => {
        //             let module = shape.card as Module;
        //
        //             if (!check(module, playerId))
        //                 return;
        //
        //             if (selected.includes(shape))
        //                 return;
        //
        //             if (selected.length === count) {
        //                 selected[selected.length - 1].setStrokeStyle(Color.BLACK, 0);
        //                 selected.splice(selected.length - 1, 1);
        //             }
        //
        //             selected.push(shape);
        //             shape.setStrokeStyle(outlineColor, 5);
        //
        //             onSelected(selected.map(s => s.card as Module));
        //         });
        //     }
        // }
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
        // for (let spaceshipDrawer of Object.values(this.spaceshipDrawers)) {
        //     for (let shape of spaceshipDrawer.moduleShapes) {
        //         shape.setStrokeStyle(Color.BLACK, 0);
        //
        //         // TODO: add remove listeners and uncomment
        //         // shape.removeAllListeners('pointerdown');
        //     }
        // }
    }

    panToPlayerWithId(playerId: number, duration: number = 500) {
        let position = this.spaceshipDrawers[playerId].center;

        this.panTo(position.x, position.y, duration);
    }
}
