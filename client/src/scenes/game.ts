import Player from "../../../common/Player";
import SpaceshipDrawer from "../helpers/SpaceshipDrawer";
import Vector2 from "../../../common/Vector2";
import DragManager from "../helpers/DragManager";
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

    dragManager: DragManager;
    spaceshipDrawers: Record<string, SpaceshipDrawer> = {};

    constructor() {
        super({
            key: 'Game',
            active: true
        });
    }

    create() {
        // this.dragManager = new DragManager(this.spaceshipDrawers[this.player.id], this.handDrawer, this);
        // this.dragManager.setupEvents();

        this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (!pointer.isDown) return;

            // if (this.dragManager.isDragging) return;

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
        if (this.spaceshipDrawers[player.id] === undefined) {
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

    chooseModule(onSelected: (module?: Module, playerId?: string) => void, check: (module: Module, playerId: string) => boolean, required: boolean, outlineColor: number): void {
        let selected: Phaser.GameObjects.Container;

        for (let [id, spaceshipDrawer] of Object.entries(this.spaceshipDrawers)) {
            for (let shape of spaceshipDrawer.moduleShapes) {
                shape.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    let module = shape.getData('module') as Module;

                    if (!check(module, id))
                        return;

                    (selected.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                    if (!required && shape === selected) {
                        onSelected();
                        return;
                    }

                    selected = shape;
                    (selected.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(5, outlineColor);

                    onSelected(module, id);
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
}