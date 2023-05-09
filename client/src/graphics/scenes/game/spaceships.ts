import Player from "../../../../../common/Player";
import SpaceshipDrawer from "../../SpaceshipDrawer";
import Vector2 from "../../../../../common/Vector2";
import Module from "../../../../../common/modules/Module";
import Game from "../../../Game";

let spaceshipConfigurations: Vector2[][] = [
    [new Vector2(0, 0)],
    [new Vector2(0, 0), new Vector2(0, -1000)],
    [new Vector2(0, 0), new Vector2(-1000, -1000), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000)],
    [new Vector2(0, 0), new Vector2(0, -1000), new Vector2(1000, 0), new Vector2(1000, -1000), new Vector2(500, 1500)]
];

export default class Spaceships extends Phaser.Scene {
    full_scale = 0.75;
    hand_scale = 0.5;

    spaceshipDrawers: Record<number, SpaceshipDrawer> = {};

    isDragging: boolean = false;
    gameManager: Game;

    constructor(game: Game) {
        super({
            key: 'Spaceships',
            active: true
        });

        this.gameManager = game;
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

    preload() {
        // this.load.image('modules', '/assets/modules.png');
        this.load.atlas('modules', '/assets/modules-half.png', '/assets/modules-atlas.json');
    }

    drawSpaceshipOf(player: Player, index: number, count: number): void {
        console.log(this.textures.get('modules'));

        if (this.spaceshipDrawers[player.link] === undefined) {
            const spaceshipPosition = spaceshipConfigurations[count - 1][index];

            this.spaceshipDrawers[player.link] = new SpaceshipDrawer(
                player.spaceship,
                spaceshipPosition,
                new Vector2(256, 256),
                this
            );

            let currentPlayer = this.gameManager.getCurrentPlayer();
            if (currentPlayer && player.link === currentPlayer.link) {
                this.panToPlayerWithLink(currentPlayer.link, 0);
            }
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
                        selected = undefined;
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

    chooseModules(onSelected: (modules: Module[]) => void, check: (module: Module, playerLink: number) => boolean, count: number, outlineColor: number): void {
        let selected: Phaser.GameObjects.Container[] = [];

        for (let link of Object.keys(this.spaceshipDrawers)) {
            for (let shape of this.spaceshipDrawers[link].moduleShapes) {
                shape.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
                    let module = shape.getData('module') as Module;

                    if (!check(module, parseInt(link)))
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

    playersDataUpdated() {
        for (let [index, player] of this.gameManager.players.entries()) {
            this.drawSpaceshipOf(player, index, this.gameManager.players.length);
        }
    }

    endChoosingModule() {
        for (let [id, spaceshipDrawer] of Object.entries(this.spaceshipDrawers)) {
            for (let shape of spaceshipDrawer.moduleShapes) {
                (shape.getAll()[0] as Phaser.GameObjects.Rectangle).setStrokeStyle(0);

                shape.removeAllListeners('pointerdown');
            }
        }
    }

    panToPlayerWithLink(link: number, duration: number = 500) {
        let position = this.spaceshipDrawers[link].center;

        this.cameras.main.pan(position.x, position.y, duration, 'Sine.easeInOut');
    }
}