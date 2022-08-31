enum ModuleTypes {
    MainModule,

    // weapon
    SpaceSolver,

    // energy sources
    SolarPanel,

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

    connectors: Record<string, number>;
    strength: number = 0;
    capacity: number = 0;
    energyIncrease: number = 0;
    x: number = 0;
    y: number = 0;
    sprite: string;
    isMain: boolean = false;
    type: ModuleTypes;
    totalHealth: number;
    health: number;

    constructor(connectors: Record<string, number>) {
        this.connectors = connectors;
    }
}

export default Module;

export {
    Module,
    ModuleTypes
}