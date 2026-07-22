import {GameSettings, MainModuleType, ModuleCard, ModuleType} from "../Types";

export type ModuleInfo = {
    configurations: {
        left: 0 | 1 | 2,
        top: 0 | 1 | 2,
        right: 0 | 1 | 2,
        bottom: 0 | 1 | 2,
    }[],
    name: string,
    health: number,

    // optional
    /**
     * What the card does beyond its stats, in prose. Cards without one are fully described by their
     * stats.
     *
     * Every cost and amount an ability names is a setting a game can be created with, so the text is
     * written against the settings of the game being played rather than fixed here.
     */
    description?: (settings: GameSettings) => string,
    capacity?: number,
    strength?: number,
    energyCost?: number,
    energyIncrease?: number
};

export const mainModulesInfo: Record<MainModuleType, ModuleInfo> = {
    [MainModuleType.DrawAnotherEventCard]: {
        name: "Командный модуль I",
        description: settings => "Сразу после вытягивания карты действия вы можете потратить "
            + `${settings.energyToDragAnotherEventCardByMainModule} энергии, чтобы скинуть текущую `
            + "карту действий, а затем вытянуть новую.",
        health: 13,
        energyIncrease: 1,
        capacity: 5,
        configurations: [
            {top: 1, right: 1, bottom: 1, left: 2}
        ]
    },
    [MainModuleType.DrawAdditionalModuleCard]: {
        name: "Командный модуль II",
        description: settings => `Во время вашего хода в фазе строительства вы можете, заплатив ${settings.energyToDragAdditionalCardByMainModule} энергии, взять 1 карту из стопки строительства (используется 1 раз за ход).`,
        health: 13,
        energyIncrease: 1,
        capacity: 5,
        configurations: [
            {top: 2, right: 1, bottom: 2, left: 2}
        ]
    },
    [MainModuleType.MoveDamage]: {
        name: "Командный модуль III",
        description: settings => `Перед своим ходом вы можете перенести до ${settings.damageMovedByMainModule} урона с одного модуля на другой за ${settings.energyToMoveDamageByMainModule} энергии.`,
        health: 13,
        energyIncrease: 1,
        capacity: 5,
        configurations: [
            {top: 2, right: 2, bottom: 1, left: 1}
        ]
    },
    [MainModuleType.UseModuleSecondTime]: {
        name: "Командный модуль IV",
        description: () => "Во время своей атаки или в фазе использования модулей вы можете использовать одни из ваших модулей 2 раз за удвоенное количество энергии.",
        health: 13,
        energyIncrease: 1,
        capacity: 5,
        configurations: [
            {top: 2, right: 2, bottom: 2, left: 2}
        ]
    },
    [MainModuleType.AttackOrRunaway]: {
        name: "Командный модуль V",
        description: settings => `Перед своим ходом вы можете, заплатив ${settings.energyToAttackByMainModule} энергии, напасть на любого игрока. Во время боя перед атакой вы можете заплатить ${settings.mainModuleRunawayEnergyCost} энергии, чтобы сбежать из боя.`,
        health: 13,
        energyIncrease: 1,
        capacity: 5,
        configurations: [
            {top: 1, right: 1, bottom: 1, left: 1}
        ]
    },
}

export const modulesInfo = {
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
