import {Event} from "../events/Event";
import Vector2 from "../Vector2";

enum ModuleTypes {
    MainModule,

    // weapon
    SpaceSolver,
    IonDestroyer,
    QuantumDestabilizer,

    // energy sources
    SolarPanel,
    NuclearReactor,
    DarkMatterGenerator,

    // energy storage
    SmallBattery,
    Battery,

    // protectors
    SmallQuantumProtector,
    QuantumProtector,

    // other
    AttackModule,
    RepairModule,
    StructureModule
}

class Module {
    name: string;
    description?: string;

    connectors: { top: number, right: number, bottom: number, left: number };
    strength: number = 0;
    capacity: number = 0;
    energyCost: number = 0;
    energyIncrease: number = 0;
    x: number = 0;
    y: number = 0;
    sprite: string;
    isMain: boolean = false;
    type: ModuleTypes;
    totalHealth: number;
    health: number;
    rotation: number = 0;
    isActivated: boolean = false;

    constructor(connectors: { top: number, right: number, bottom: number, left: number }) {
        this.connectors = connectors;
    }

    isDamaged(): boolean {
        return this.health !== this.totalHealth;
    }

    getConnector(direction: string): number {
        let directions = ["right", "top", "left", "bottom"];

        let index = directions.indexOf(direction);

        index = (index + this.rotation) % 4;

        return this.connectors[directions[index]];
    }

    getPosition(): Vector2 {
        return new Vector2(this.x, this.y);
    }

    toString(): string {
        return this.name;
    }
}

function isModule(card: Module | Event) {
    return (card as Module).name !== undefined;
}

export default Module;

export {
    Module,
    ModuleTypes,
    isModule
}
