import Spaceships from "./scenes/Spaceships";
import Module from "@common/modules/Module";
import {PlayerId} from "@common/Player";
import {BoundaryType, CountBoundary} from "./CountBoundary";
import Color from "./Color";
import {Card} from "./shapes/Card";
import {Observable} from "./Observable";
import Vector2 from "@common/Vector2";

type SelectedModuleInfo = {
    module: Module,
    player: PlayerId
}

export class ChooseModuleManager {
    private handle: Observable<SelectedModuleInfo[]>;
    private selected: {
        player: PlayerId,
        position: Vector2,
    }[] = [];

    constructor(
        private scene: Spaceships,
        private check: (info: SelectedModuleInfo) => boolean,
        private count: CountBoundary,
        private strokeColor: Color
    ) {
        this.handle = new Observable<SelectedModuleInfo[]>([]);
    }

    activate() {
        for (const info of this.selected) {
            this.getShape(info).strokeWidth(5).stroke(this.strokeColor.toString());
        }

        for (let key in this.scene.spaceshipShapes) {
            const playerId = parseInt(key);

            for (let shape of this.scene.spaceshipShapes[playerId].children) {
                const card = shape as Card;
                const info = {
                    player: playerId,
                    position: new Vector2((card.card() as Module).x, (card.card() as Module).y),
                };

                if (!this.check({player: playerId, module: card.card() as Module})) {
                    card.setState('DISABLED');
                    continue;
                }

                card.setState('ENABLED');

                shape.on('click.choosemodule', () => {
                    const selected = this.isSelected(info);

                    if (this.reachedUpperBound() && !selected) {
                        this.deselect(this.selected[this.selected.length - 1]);
                    }

                    if (this.reachedLowerBound() && selected) {
                        return;
                    }

                    if (selected) {
                        this.deselect(info);
                    } else {
                        this.select(info);
                    }

                    this.updateHandle();
                });
            }
        }
    }

    getHandle(): Observable<SelectedModuleInfo[]> {
        return this.handle;
    }

    private isEqual(left: { player: PlayerId, position: Vector2 }, right: { player: PlayerId, position: Vector2 }) {
        return left.player === right.player && left.position.x === right.position.x && left.position.y === right.position.y;
    }

    private isSelected(info: { player: PlayerId, position: Vector2 }) {
        return this.selected.find(s => this.isEqual(s, info)) !== undefined;
    }

    private reachedUpperBound() {
        return (this.count.type === BoundaryType.NO_MORE_THAN || this.count.type === BoundaryType.EQUAL) && this.selected.length === this.count.count;
    }

    private reachedLowerBound() {
        return (this.count.type === BoundaryType.AT_LEAST || this.count.type === BoundaryType.EQUAL) && this.selected.length === this.count.count;
    }

    private deselect(info: { player: PlayerId, position: Vector2 }) {
        this.getShape(info).strokeWidth(0);

        this.selected = this.selected.filter(s => !this.isEqual(s, info));
    }

    private select(info: { player: PlayerId, position: Vector2 }) {
        this.getShape(info).strokeWidth(5).stroke(this.strokeColor.toString());
        this.selected.push(info);
    }

    private updateHandle() {
        this.handle.set(this.selected.map(s => {
            return {
                player: s.player,
                module: this.getShape(s).card() as Module
            };
        }))
    }

    private getShape({player, position}: { player: PlayerId, position: Vector2 }): Card {
        const spaceship = this.scene.spaceshipShapes[player];
        return spaceship.getModules().find(card => {
            const module = card.card() as Module;
            return module.x === position.x && module.y === position.y;
        });
    }
}