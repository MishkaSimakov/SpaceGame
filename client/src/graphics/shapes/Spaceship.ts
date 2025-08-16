import {isMainModule} from "@common/modules/Module";
import Spaceship from "@common/Spaceship";
import Vector2 from "@common/Vector2";

import {ModuleShape} from "./Card";

import {Group, GroupConfig} from "konva/lib/Group";

type SpaceshipShapeConfig = GroupConfig & {
    key: string,
    cardSize: number,
    spaceship: Spaceship
};

export class SpaceshipShape extends Group {
    private readonly key: string;
    private readonly cardSize: number;

    constructor(config: SpaceshipShapeConfig) {
        super(config);

        this.key = config.key;
        this.cardSize = config.cardSize;

        const storedPosition = localStorage.getItem(this.getStorageKey());
        if (storedPosition) {
            const [x, y] = storedPosition.split(',').map(Number);

            if (Number.isNaN(x) || Number.isNaN(y)) {
                localStorage.removeItem(this.getStorageKey());
            }

            this.setPosition({x, y});
        }

        this.setSpaceship(config.spaceship);
    }

    setSpaceship(spaceship: Spaceship): SpaceshipShape {
        this.destroyChildren();

        let cardSize = this.cardSize;

        for (let module of spaceship.modules) {
            const shape = new ModuleShape(module, cardSize);
            shape.setAttrs({
                x: module.x * cardSize,
                y: module.y * cardSize,
                originX: 0.5,
                originY: 0.5
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
        return (this.children ?? []) as ModuleShape[];
    }

    transformToCardPosition(pos: Vector2): Vector2 {
        let cardSize = this.cardSize;

        return new Vector2({
            x: Math.round(pos.x / cardSize),
            y: Math.round(pos.y / cardSize)
        });
    }

    setModulesDraggable(draggable: boolean) {
        this.getModules().forEach(card => {
            if (!isMainModule(card.module)) {
                card.draggable(draggable);
            }
        });
    }

    private getStorageKey() {
        return `spaceships//${this.key}`;
    }
}
