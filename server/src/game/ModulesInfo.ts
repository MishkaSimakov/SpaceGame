import {ModuleType} from "@common/Types";

type ModuleInfo = {
    configurations: {
        left: 0 | 1 | 2,
        top: 0 | 1 | 2,
        right: 0 | 1 | 2,
        bottom: 0 | 1 | 2,
    }[],
    name: string,
    health: number,

    // optional
    capacity?: number,
    strength?: number,
    energyCost?: number,
    energyIncrease?: number
};

export default {
    [ModuleType.DarkMatterGenerator]: {
        name: "Генератор тёмной материи",
        health: 3,
        energyIncrease: 3,
        configurations: [
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 2, bottom: 2, left: 1}
        ]
    },
    [ModuleType.SmallQuantumProtector]: {
        name: "Малый квантовый протектор",
        health: 3,
        energyCost: 2,
        configurations: [
            {top: 0, right: 0, bottom: 1, left: 0},
            {top: 0, right: 0, bottom: 1, left: 0},
            {top: 0, right: 0, bottom: 1, left: 0},
            {top: 0, right: 0, bottom: 2, left: 0},
            {top: 0, right: 0, bottom: 2, left: 0}
        ]
    },
    [ModuleType.QuantumProtector]: {
        name: "Квантовый протектор",
        health: 5,
        energyCost: 5,
        configurations: [
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1}
        ]
    },
    [ModuleType.AttackModule]: {
        name: "Абордажный модуль",
        health: 3,
        energyCost: 5,
        configurations: [
            {top: 0, right: 0, bottom: 1, left: 0},
            {top: 0, right: 0, bottom: 1, left: 0},
            {top: 0, right: 0, bottom: 2, left: 0},
            {top: 0, right: 0, bottom: 2, left: 0},
            {top: 0, right: 0, bottom: 2, left: 0}
        ]
    },
    [ModuleType.SolarPanel]: {
        name: 'Солнечная батарея',
        health: 1,
        energyIncrease: 1,
        configurations: [
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 2, left: 2}
        ]
    },
    [ModuleType.SpaceSolver]: {
        name: "Космический порешатель",
        health: 1,
        energyCost: 1,
        strength: 1,
        configurations: [
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 1, bottom: 1, left: 1}
        ]
    },
    [ModuleType.NuclearReactor]: {
        name: "Атомный реактор",
        health: 3,
        energyIncrease: 2,
        configurations: [
            {top: 0, right: 2, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 1, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 2, bottom: 2, left: 2},
            {top: 0, right: 1, bottom: 2, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 1, bottom: 1, left: 1},
            {top: 0, right: 2, bottom: 1, left: 1}
        ]
    },
    [ModuleType.SmallBattery]: {
        name: "Малый аккумулятор",
        health: 3,
        capacity: 5,
        configurations: [
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 1}
        ]
    },
    [ModuleType.QuantumDestabilizer]: {
        name: "Квантовый дестабилизатор",
        health: 3,
        energyCost: 5,
        strength: 5,
        configurations: [
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 1}
        ]
    },
    [ModuleType.Battery]: {
        name: "Аккумулятор",
        health: 4,
        capacity: 10,
        configurations: [
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 1}
        ]
    },
    [ModuleType.RepairModule]: {
        name: "Ремонтный модуль",
        health: 3,
        energyCost: 2,
        configurations: [
            {top: 2, right: 2, bottom: 2, left: 2},
            {top: 1, right: 1, bottom: 1, left: 2},
            {top: 2, right: 2, bottom: 2, left: 1},
            {top: 1, right: 2, bottom: 1, left: 2},
            {top: 1, right: 1, bottom: 1, left: 1}
        ]
    },
    [ModuleType.StructureModule]: {
        name: "Структурный модуль",
        health: 5,
        configurations: [
            {top: 2, right: 2, bottom: 2, left: 2},
            {top: 2, right: 1, bottom: 1, left: 2},
            {top: 2, right: 2, bottom: 1, left: 1},
            {top: 1, right: 2, bottom: 1, left: 2},
            {top: 1, right: 1, bottom: 2, left: 2},
            {top: 1, right: 1, bottom: 2, left: 1},
            {top: 1, right: 1, bottom: 1, left: 1},
            {top: 1, right: 2, bottom: 2, left: 1},
            {top: 2, right: 1, bottom: 2, left: 2},
            {top: 2, right: 1, bottom: 2, left: 1}
        ]
    },
    [ModuleType.IonDestroyer]: {
        name: "Ионный разрушитель",
        health: 3,
        energyCost: 2,
        strength: 3,
        configurations: [
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 1},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 2, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 2},
            {top: 0, right: 1, bottom: 0, left: 1},
            {top: 0, right: 1, bottom: 0, left: 1}
        ]
    }
} as Record<ModuleType, ModuleInfo>;
