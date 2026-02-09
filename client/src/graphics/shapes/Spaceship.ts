import {ModuleCard, Spaceship as SpaceshipData} from "@common/Types"

import {Group} from "../engine/Group";
import {NodeConfig} from "../engine/Node";
import {GetSet, Vector2} from "../engine/types";
import {Factory} from "../engine/Factory";
import {CardShape} from "./CardShape";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {ModuleGetters} from "@common/getters/Module";

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
            } else {
                this.setPosition({x, y});
            }
        }
    }

    setSpaceship(spaceship: SpaceshipData): Spaceship {
        this.destroyChildren();

        let cardSize = this.cardSize();

        for (let module of spaceship.modules) {
            let shape = new CardShape({
                card: ModuleGetters.asCard(module),
                size: cardSize,
                x: module.x * cardSize,
                y: module.y * cardSize,
                originY: 0.5,
                originX: 0.5,
            });

            this.add(shape);

            if (ModuleGetters.isMain(module)) {
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
        return (this.children ?? []) as CardShape[];
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
            if (!ModuleGetters.isMain((card.card() as { cardType: "module", module: ModuleCard }).module)) {
                card.draggable(draggable);
            }
        });
    }

    deleteModules(modules: ModuleCard[]) {
        const toDestroy = this.getModules().filter(shape => {
            const spaceshipModule = (shape.card() as { cardType: "module", module: ModuleCard }).module;

            return modules.map(m => m.id).includes(spaceshipModule.id);
        });

        toDestroy.forEach(s => s.destroy());
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
