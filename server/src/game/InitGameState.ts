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


function addEvents(idCounterRef: { value: number }, type: EventType, description: string, count: number): EventCard[] {
    const events: EventCard[] = [];

    for (let i = 0; i < count; i++) {
        events.push({
            id: idCounterRef.value++,
            type,
            description
        });
    }

    return events;
}

function getInitialEventsStack(idCounterRef: { value: number }): EventCard[] {
    return Object.entries(eventsInfo)
        .flatMap(([type, info]) => addEvents(idCounterRef, type as EventType, info.description, info.count));
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

    for (const [type, info] of Object.entries(modulesInfo)) {
        modules.push(...getModulesFromConfig(idCounterRef, type as ModuleType, info));
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

    for (const [type, info] of Object.entries(mainModulesInfo)) {
        const module = getModulesFromConfig(idCounterRef, ModuleType.MainModule, info)[0];
        module.mainModuleType = type as MainModuleType;

        modules.push(module);
    }

    return modules;
}

export function getInitialGameState(users: IUser[], settings: GameSettings): GameState {
    const idCounter = {value: 0};

    return {
        stack: {
            module: getInitialModulesStack(idCounter),
            event: getInitialEventsStack(idCounter)
        },
        discards: {
            module: [],
            event: []
        },
        mainModulesStack: getInitialMainModulesStack(idCounter),
        players: initPlayers(users),
        currentPlayerId: users[0].id,
        settings,
        timeRecords: []
    };
}