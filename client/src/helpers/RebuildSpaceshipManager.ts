import Game from "../scenes/game";
import Controls from "../scenes/controls";
import Player from "../../../common/Player";
import Module from "../../../common/modules/Module";
import Spaceship from "../../../common/Spaceship";
import Vector2 from "../../../common/Vector2";
import {Event} from "../../../common/events/Event";

export default class RebuildSpaceshipManager {
    game: Game;
    controls: Controls;
    player: Player;

    constructor(game: Game, controls: Controls) {
        this.game = game;
        this.controls = controls;
    }

    allowRebuildSpaceship() {
        this.game.spaceshipDrawers[this.player.link].allowDrag();
        this.controls.handDrawer.allowDrag();

        console.log(this.game.spaceshipDrawers[this.player.link]);

        this.removeEvents();
        this.addEvents();
    }

    disallowRebuildSpaceship() {
        this.game.spaceshipDrawers[this.player.link].disallowDrag();
        this.controls.handDrawer.disallowDrag();

        this.removeEvents();
    }

    protected addEvents() {
        let spaceship: Spaceship = this.player.spaceship;
        let hand: (Module|Event)[] = this.player.hand;
        let spaceshipDrawer = this.game.spaceshipDrawers[this.player.link];

        for (let shape of spaceshipDrawer.moduleShapes) {
            let module: Module = shape.getData('module');

            if (module.isMain)
                continue;

            shape.on('dragstart', () => {
                this.game.isDragging = true;
            })

            shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                shape.setPosition(x, y);
            });

            shape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                this.game.isDragging = false;

                let localPosition = spaceshipDrawer.getLocalPosition(new Vector2(pointer.worldX, pointer.worldY));

                spaceship.removeModule(module.x, module.y);

                if (spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    let newPosition = spaceshipDrawer.getGlobalPosition(localPosition);
                    shape.setPosition(newPosition.x, newPosition.y);

                    let unconnected = spaceship.getUnconnectedModules();
                    spaceship.removeModule(unconnected);

                    spaceshipDrawer.draw();
                    spaceshipDrawer.allowDrag();

                    hand.push(...unconnected);

                    this.controls.handDrawer.draw();
                    this.controls.handDrawer.allowDrag();

                    this.removeEvents();
                    this.addEvents();

                    return;
                }

                // remove from spaceship modules
                // remove from spaceship shapes

                // find modules that become unconnected to main module
                let unconnected = spaceship.getUnconnectedModules();
                spaceship.removeModule(unconnected);

                spaceshipDrawer.draw();
                spaceshipDrawer.allowDrag();

                // add to hand cards
                hand.push(module, ...unconnected);

                // add to hand shapes
                this.controls.handDrawer.draw();
                this.controls.handDrawer.allowDrag();

                this.removeEvents();
                this.addEvents();
            });
        }

        for (let shape of this.controls.handDrawer.cardShapes) {
            let module: Module = shape.getData('module');

            shape.on('dragstart', () => {
                this.game.isDragging = true;
            })

            shape.on('drag', (pointer: Phaser.Input.Pointer, x: number, y: number) => {
                shape.setPosition(x, y);
            });

            shape.on('dragend', (pointer: Phaser.Input.Pointer) => {
                this.game.isDragging = false;

                let position = this.game.cameras.main.getWorldPoint(pointer.x, pointer.y);
                let localPosition = spaceshipDrawer.getLocalPosition(new Vector2(position.x, position.y));

                if (spaceship.addModule(module, localPosition.x, localPosition.y)) {
                    // remove from hand cards
                    hand.splice(hand.indexOf(module),  1);

                    // remove from hand shapes
                    this.controls.handDrawer.cardShapes = this.controls.handDrawer.cardShapes.filter(s => s !== shape);
                    shape.destroy();

                    // add to spaceship modules
                    // add to spaceship shapes
                    spaceshipDrawer.draw();
                    spaceshipDrawer.allowDrag();

                    this.removeEvents();
                    this.addEvents();

                    return;
                }

                shape.setPosition(shape.input.dragStartX, shape.input.dragStartY);
            });
        }
    }

    protected removeEvents() {
        for (let shape of this.game.spaceshipDrawers[this.player.link].moduleShapes) {
            shape.removeAllListeners('drag');
            shape.removeAllListeners('dragend');
            shape.removeAllListeners('dragstart');
        }

        for (let shape of this.controls.handDrawer.cardShapes) {
            shape.removeAllListeners('drag');
            shape.removeAllListeners('dragend');
            shape.removeAllListeners('dragstart');
        }
    }
}