import {isMainModule} from "@common/modules/Module";
import SpaceshipData from "@common/Spaceship";

import {Group} from "../engine/Group";
import {NodeConfig} from "../engine/Node";
import {GetSet, Vector2} from "../engine/types";
import {Factory} from "../engine/Factory";
import {Card} from "./Card";

export interface SpaceshipConfig extends NodeConfig {
    id: string,
    cardSize: number,
    spaceship?: SpaceshipData,
}

export class Spaceship extends Group<SpaceshipConfig> {
    constructor(config: SpaceshipConfig) {
        super(config);

        const storedPosition = localStorage.getItem(this.getStorageKey());
        if (storedPosition) {
            const [x, y] = storedPosition.split(',').map(Number);

            if (Number.isNaN(x) || Number.isNaN(y)) {
                localStorage.removeItem(this.getStorageKey());
            }

            this.setPosition({x, y});
        }
    }

    setSpaceship(spaceship: SpaceshipData): Spaceship {
        this.destroyChildren();

        let cardSize = this.cardSize();

        for (let module of spaceship.modules) {
            let shape = new Card({
                card: module,
                size: cardSize,
                x: module.x * cardSize,
                y: module.y * cardSize,
                originY: 0.5,
                originX: 0.5
            });

            this.add(shape);

            if (isMainModule(module)) {
                shape.draggable(true).dragDistance(5);

                shape.on('dragstart', () => {
                    this.moveToTop()
                });

                shape.on('dragmove', () => {
                    // TODO: make this better
                    const newMainPosition = shape.getPosition();
                    shape.setPosition({x: 0, y: 0});

                    this.move(newMainPosition);

                    const absolutePosition = this.getPosition();
                    localStorage.setItem(this.getStorageKey(), `${absolutePosition.x},${absolutePosition.y}`);
                });
            }
        }

        this.setAttr('spaceship', spaceship);

        return this;
    }

    getModules() {
        return (this.children ?? []) as Card[];
    }

    transformToCardPosition(pos: Vector2): Vector2 {
        let cardSize = this.cardSize();

        return {
            x: Math.round(pos.x / cardSize),
            y: Math.round(pos.y / cardSize)
        };
    }

    setModulesDraggable(draggable: boolean) {
        this.getModules().forEach(card => {
            if (!isMainModule(card.card())) {
                card.draggable(draggable);
            }
        });
    }

    private getStorageKey() {
        return `spaceships//${this.id()}`;
    }

    id: GetSet<string, this>;
    spaceship: GetSet<SpaceshipData, this>;
    cardSize: GetSet<number, this>;
}

Factory.addGetterSetter(Spaceship, 'id');
Factory.addGetterSetter(Spaceship, 'spaceship');
Factory.addGetterSetter(Spaceship, 'cardSize');
