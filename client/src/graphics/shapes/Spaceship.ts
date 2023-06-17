import {Group} from "../engine/Group";
import {NodeConfig} from "../engine/Node";
import {GetSet, Vector2} from "../engine/types";
import {Factory} from "../engine/Factory";
import SpaceshipData from "../../../../common/Spaceship";
import {Card} from "./Card";
import Module from "../../../../common/modules/Module";

export interface SpaceshipConfig extends NodeConfig {
    cardSize: number,
    spaceship?: SpaceshipData,
}

export class Spaceship extends Group<SpaceshipConfig> {
    constructor(config: SpaceshipConfig) {
        super(config);
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

            if (module.isMain) {
                shape.draggable(true).dragDistance(5);

                shape.on('dragstart', () => {
                    this.moveToTop()
                });

                shape.on('dragmove', () => {
                    // TODO: make this better
                    let newMainPosition = shape.getPosition();
                    shape.setPosition({x: 0, y: 0});

                    this.move(newMainPosition);
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
        this.children?.forEach(c => {
            let card = (c as Card).card();

            if (!(card as Module).isMain)
                c.draggable(draggable);
        });
    }

    spaceship: GetSet<SpaceshipData, this>;
    cardSize: GetSet<number, this>;
}

Factory.addGetterSetter(Spaceship, 'spaceship');
Factory.addGetterSetter(Spaceship, 'cardSize');
