import Player from "../../../common/Player";
import SpaceshipDrawer from "../helpers/SpaceshipDrawer";
import Vector2 from "../../../common/Vector2";
import Module from "../../../common/modules/Module";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -1000)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)]
];

export default class Game extends Phaser.Scene {
    full_scale = 0.75;
    hand_scale = 0.5;

    spaceshipDrawers: Record<number, SpaceshipDrawer> = {};

    isDragging: boolean = false;

    constructor() {
        super({
            key: 'Game',
            active: true
        });
    }

    create() {
        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            if (this.isDragging) return;

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
        if (this.spaceshipDrawers[player.link] === undefined) {
            const spaceshipPosition = spaceshipConfigurations[count - 1][index];

            this.spaceshipDrawers[player.link] = new SpaceshipDrawer(
                player.spaceship,
                spaceshipPosition,
                new Vector2(256, 256),
                this
            );
        } else {
            this.spaceshipDrawers[player.link].spaceship = player.spaceship;
        }

        this.spaceshipDrawers[player.link].draw();
    }

    chooseModule(onSelected: (module?: Module, playerLink?: number) => void, check: (module: Module, playerLink: number) => boolean, required: boolean, outlineColor: number): void {
        let selected: Phaser.GameObjects.Container;

        for (let link of Object.keys(this.spaceshipDrawers)) {
            for (let shape of this.spaceshipDrawers[link].moduleShapes) {
                shape.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    let module = shape.getData('module') as Module;

                    if (!check(module, parseInt(link)))
                        return;

                    if (selected !== undefined)
                        (selected.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                    if (!required && shape === selected) {
                        onSelected();
                        return;
                    }

                    selected = shape;
                    (selected.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, outlineColor);

                    onSelected(module, parseInt(link));
                });
            }
        }
    }

    endChoosingModule() {
        for (let [id, spaceshipDrawer] of Object.entries(this.spaceshipDrawers)) {
            for (let shape of spaceshipDrawer.moduleShapes) {
                shape.removeAllListeners('pointerdown');
            }
        }
    }

    panToPlayerWithLink(link: number) {
        let position = this.spaceshipDrawers[link].center;

        this.cameras.main.pan(position.x, position.y, 500, 'Sine.easeInOut');
    }
}