import {
    EventCard,
    EventType,
    GameSettings,
    GameState,
    MainModuleType,
    ModuleCard,
    ModuleType,
    Player,
} from "@common/Types";
import {mainModulesInfo, ModuleInfo, modulesInfo} from "@common/cards/Modules";
import {eventsInfo} from "@common/cards/Events";

import {IUser} from "@src/game/interfaces/IUser";


function addEvents(type: EventType, description: string, count: number): EventCard[] {
    let events: EventCard[] = [];

    for (let i = 0; i < count; i++) {
        events.push({type, description});
    }

    return events;
}

function getInitialEventsStack(): EventCard[] {
    return Object.entries(eventsInfo)
        .flatMap(([type, info]) => addEvents(type as EventType, info.description, info.count));
}

function getModulesFromConfig(idCounterRef: { value: number }, type: ModuleType, config: ModuleInfo): ModuleCard[] {
    return config.configurations.map(connectors => ({
        id: idCounterRef.value++,
        name: config.name,
        connectors: connectors,
        strength: config.strength ?? 0,
        capacity: config.capacity ?? 0,
        energyCost: config.energyCost ?? 0,
        energyIncrease: config.energyIncrease ?? 0,
        type: type as ModuleType,
        totalHealth: config.health,
        health: config.health,
        x: 0,
        y: 0,
        rotation: 0,
    }));
}

function getInitialModulesStack(idCounterRef: { value: number }): ModuleCard[] {
    const modules: ModuleCard[] = [];

    for (let [type, info] of Object.entries(modulesInfo)) {
        modules.push(...getModulesFromConfig(idCounterRef, type as ModuleType, info))
    }

    return modules;
}

function initPlayers(users: IUser[]): Player[] {
    return users.map(user => ({
        id: user.id,
        name: user.login,
        spaceship: {
            modules: [],
        },
        hand: [],
        energy: 0,
        skipNextTurn: false,
        usedModuleSecondTimeOnThisTurn: false,
        lose: false,
        time: 0,
    }));
}

function getInitialMainModulesStack(idCounterRef: { value: number }) {
    const modules: ModuleCard[] = [];

    for (let [type, info] of Object.entries(mainModulesInfo)) {
        const module = getModulesFromConfig(idCounterRef, ModuleType.MainModule, info)[0];
        module.mainModuleType = type as MainModuleType;

        modules.push(module);
    }

    return modules;
}

export function getInitialGameState(users: IUser[], settings: GameSettings): GameState {
    let idCounter = 0;

    return {
        stack: {
            module: getInitialModulesStack({value: idCounter}),
            event: getInitialEventsStack()
        },
        discards: {
            module: [],
            event: []
        },
        mainModulesStack: getInitialMainModulesStack({value: idCounter}),
        players: initPlayers(users),
        currentPlayerId: users[0].id,
        settings,
        timeRecords: []
    };
}