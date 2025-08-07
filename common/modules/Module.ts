import {Event} from "../events/Event";
import SmallQuantumProtector from "./SmallQuantumProtector";
import QuantumProtector from "./QuantumProtector";
import {MainModule} from "./MainModule";
import Vector2 from "../Vector2";

export enum ModuleType {
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

export default class Module {
    id: number = moduleIdCounter++;

    name: string;

    connectors: { top: number, right: number, bottom: number, left: number };
    strength: number = 0;
    capacity: number = 0;
    energyCost: number = 0;
    energyIncrease: number = 0;
    type: ModuleType;
    totalHealth: number;
    health: number;

    x: number = 0;
    y: number = 0;
    rotation: number = 0;

    constructor(connectors: { top: number, right: number, bottom: number, left: number }) {
        this.connectors = connectors;
    }
}

export function isModule(card: Module | Event): card is Module {
    return (card as Module).name !== undefined;
}

export function isProtector(card: Module | Event): card is (SmallQuantumProtector | QuantumProtector) {
    return isModule(card) && (card.type === ModuleType.SmallQuantumProtector || card.type === ModuleType.QuantumProtector);
}

export function isMainModule(card: Module | Event): card is MainModule {
    return isModule(card) && card.type === ModuleType.MainModule;
}