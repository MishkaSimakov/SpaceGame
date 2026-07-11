import {Card, EventCard, EventType, MainModuleType, ModuleCard, ModuleType} from "@common/Types";
import {mainModulesInfo, ModuleInfo, modulesInfo} from "@common/cards/Modules";

/**
 * Card factories for tests, built from the real card definitions so that generated ships use the
 * connector layouts the game actually ships with rather than invented ones.
 */

/** Hands out ids that are unique across every card in one generated board. */
export class IdAllocator {
    private next: number;

    /** Start high to mint cards the server "drew" later, without colliding with a board's own ids. */
    constructor(start = 1) {
        this.next = start;
    }

    take(): number {
        return this.next++;
    }
}

/** One concrete module variant: a module type paired with one of its connector layouts. */
export type ModuleVariant = {
    type: ModuleType,
    info: ModuleInfo,
    connectors: ModuleInfo["configurations"][number]
};

/** Every (type, connector layout) pair a non-command module can have. */
export const MODULE_VARIANTS: ModuleVariant[] = Object.entries(modulesInfo).flatMap(
    ([type, info]) => info.configurations.map(connectors => ({
        type: type as ModuleType,
        info,
        connectors
    }))
);

export const MAIN_MODULE_TYPES = Object.keys(mainModulesInfo) as MainModuleType[];

function fromInfo(id: number, type: ModuleType, info: ModuleInfo, connectors: ModuleInfo["configurations"][number]): ModuleCard {
    return {
        id,
        name: info.name,
        connectors,
        strength: info.strength ?? 0,
        capacity: info.capacity ?? 0,
        energyCost: info.energyCost ?? 0,
        energyIncrease: info.energyIncrease ?? 0,
        type,
        totalHealth: info.health,
        health: info.health,
        x: 0,
        y: 0,
        rotation: 0
    };
}

export function makeModule(ids: IdAllocator, variant: ModuleVariant): ModuleCard {
    return fromInfo(ids.take(), variant.type, variant.info, variant.connectors);
}

export function makeMainModule(ids: IdAllocator, mainModuleType: MainModuleType): ModuleCard {
    const info = mainModulesInfo[mainModuleType];
    const module = fromInfo(ids.take(), ModuleType.MainModule, info, info.configurations[0]);

    module.mainModuleType = mainModuleType;

    return module;
}

export function makeEvent(ids: IdAllocator): EventCard {
    return {
        id: ids.take(),
        type: EventType.TakeOneBuildingCard,
        description: "test event"
    };
}

export function asCard(module: ModuleCard): Card {
    return {cardType: "module", module};
}

export function eventAsCard(event: EventCard): Card {
    return {cardType: "event", event};
}
