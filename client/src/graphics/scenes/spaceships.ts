import Vector2 from "../../../../common/Vector2";
import Module from "../../../../common/modules/Module";
import Game from "../../Game";
import Scene from "../engine/Scene";
import Color from "../Color";
import {DD} from "../engine/Drag";
import {Spaceship as SpaceshipShape} from "../shapes/Spaceship";
import {Card} from "../shapes/Card";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -2500)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Scene {
    spaceshipShapes: Record<number, SpaceshipShape> = {};

    gameManager: Game;

    spaceshipsCardSize: number;

    constructor(game: Game) {
        super({
            originX: -0.5,
            originY: -0.5
        });

        this.gameManager = game;
    }

    adopted() {
        // let pinch = new Pinch(this);

        this.spaceshipsCardSize = 256 * this.width() / 1440;

        let prevPointerPosition = undefined;
        this.getGraphics().on("pointermove", ({evt}) => {
            let pointerPosition = this.getGraphics().getRelativePointerPosition();

            if (!DD.isDragging() && prevPointerPosition && evt.buttons !== 0) {
                this.move({
                    x: pointerPosition.x - prevPointerPosition.x,
                    y: pointerPosition.y - prevPointerPosition.y
                });
            }

            prevPointerPosition = pointerPosition;
        });

        this.getGraphics().on("pointerup", () => {
            prevPointerPosition = undefined;
        })

        this.getGraphics().on("wheel", ({evt}) => {
            let deltaY = evt.deltaY,
                zoom = this.scaleX(),
                newZoom = zoom,
                pos = this.getRelativePointerPosition();

            newZoom = Math.min(
                2,
                Math.max(0.1, zoom - deltaY * 0.01)
            );

            this.move({
                x: pos.x * (zoom - newZoom),
                y: pos.y * (zoom - newZoom)
            });

            this.scaleX(newZoom).scaleY(newZoom);
        });

        // pinch.on('pinch', (pinch) => {
        //     this.cameras.main.zoom *= pinch.scaleFactor;
        // });
    }

    chooseModule(onSelected: (module?: Module, playerId?: number) => void, check: (module: Module, playerId: number) => boolean, required: boolean, outlineColor: Color): void {
        let selected: Card;

        for (let key in this.spaceshipShapes) {
            let playerId = parseInt(key);

            for (let shape of this.spaceshipShapes[playerId].children) {
                const card = shape as Card;

                shape.on('click', () => {
                    console.log("click!2");
                    let module = card.card() as Module;

                    if (!check(module, playerId))
                        return;

                    if (selected !== undefined)
                        selected._background.strokeWidth(0);

                    if (!required && shape === selected) {
                        selected = undefined;
                        onSelected();

                        return;
                    }

                    selected = card;
                    selected._background.strokeWidth(5)
                        .stroke(outlineColor.toString());

                    onSelected(module, playerId);
                });
            }
        }
    }

    chooseModules(onSelected: (modules: Module[]) => void, check: (module: Module, playerId: number) => boolean, count: number, outlineColor: Color): void {
        let selected: Card[] = [];

        for (let key in this.spaceshipShapes) {
            let playerId = parseInt(key);
            for (let shape of this.spaceshipShapes[playerId].children) {
                const card = shape as Card;

                shape.on('click', () => {
                    console.log("click!")
                    let module = card.card() as Module;

                    if (!check(module, playerId))
                        return;

                    if (selected.includes(card))
                        return;

                    if (selected.length === count) {
                        selected[selected.length - 1]._background.strokeWidth(0);
                        selected.splice(selected.length - 1, 1);
                    }

                    selected.push(card);
                    card._background.strokeWidth(5)
                        .stroke(outlineColor.toString());

                    onSelected(selected.map(s => s.card() as Module));
                });
            }
        }
    }

    updateData() {
        let players = this.gameManager.getAllPlayers();

        for (let [index, player] of players.entries()) {
            if (this.spaceshipShapes[player.id] === undefined) {
                const spaceshipPosition = spaceshipConfigurations[players.length - 1][index];

                this.spaceshipShapes[player.id] = new SpaceshipShape({
                    cardSize: this.spaceshipsCardSize,
                    x: spaceshipPosition.x,
                    y: spaceshipPosition.y,
                });

                this.spaceshipShapes[player.id].spaceship(player.spaceship);

                this.add(this.spaceshipShapes[player.id]);

                if (player.id === this.gameManager.currentPlayer.id) {
                    this.panToPlayerWithId(player.id, 0);
                }
            } else {
                this.spaceshipShapes[player.id].setSpaceship(player.spaceship);
            }
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
        let position = this.spaceshipShapes[playerId].getPosition();

        this.panTo(position.x, position.y, duration);
    }
}
