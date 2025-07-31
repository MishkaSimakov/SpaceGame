import {Event} from "../events/Event";

enum ModuleType {
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

export let moduleIdCounter = 0;

class Module {
    id: number = moduleIdCounter++;

    name: string;

    connectors: { top: number, right: number, bottom: number, left: number };
    strength: number = 0;
    capacity: number = 0;
    energyCost: number = 0;
    energyIncrease: number = 0;
    x: number = 0;
    y: number = 0;
    sprite: string;
    isMain: boolean = false;
    type: ModuleType;
    totalHealth: number;
    health: number;
    rotation: number = 0;
    isActivated: boolean = false;

    constructor(connectors: { top: number, right: number, bottom: number, left: number }) {
        this.connectors = connectors;
    }
}

function isModule(card: Module | Event): card is Module {
    return (card as Module).name !== undefined;
}

export default Module;

export {
    Module,
    ModuleType,
    isModule
}
