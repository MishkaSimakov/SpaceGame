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

import {mainModulesInfo, ModuleInfo, modulesInfo} from "./ModulesInfo";

type UserInfo = {
    id: number,
    login: string
};

function addEvents(type: EventType, description: string, count: number): EventCard[] {
    let events: EventCard[] = [];

    for (let i = 0; i < count; i++) {
        events.push({type, description});
    }

    return events;
}

function getInitialEventsStack(): EventCard[] {
    return [
        ...addEvents(EventType.TakeOneBuildingCard, "Возьмите 1 карту\nстроительства", 2),
        ...addEvents(EventType.TakeTwoBuildingCards, "Возьмите 2 карты\nстроительства", 2),
        ...addEvents(EventType.LooseFiveEnergy, "Сбросьте 1 энергию", 2),
        ...addEvents(EventType.TakeFiveEnergy, "Получите 1 энергию", 2),
        ...addEvents(EventType.SkipNextTurn, "Пропустите ход", 2),
        ...addEvents(EventType.LooseAllYourCards, "Скиньте все свои карты", 2),
        ...addEvents(EventType.DestroyAnyModuleOnYourSpaceship, "Уничтожьте любой\nмодуль вашего корабля\nна ваш выбор", 2),
        ...addEvents(EventType.DestroyTwoSolarPanelsOnYourSpaceship, "Уничтожьте 2 солнечные\nбатареи вашего корабля", 2),
        ...addEvents(EventType.AttackRight, "Атакуйте игрока\nсправа от вас", 2),
        ...addEvents(EventType.AttackLeft, "Атакуйте игрока\nслева от вас", 2),
        ...addEvents(EventType.AttackNextToRight, "Атакуйте игрока\nчерез одного справа\nот вас", 2),
        ...addEvents(EventType.AttackNextToLeft, "Атакуйте игрока\nчерез одного слева\nот вас", 2),
        ...addEvents(EventType.AttackAny, "Атакуйте игрока\nна ваш выбор", 2),
        ...addEvents(EventType.TossDiceAndTakeBuildingCards, "Киньте кубик.\nПри выпадении ≤4\nвозьмите 1 карту\nстроительства,\nиначе - 2 карты\nстроительства", 2),
        ...addEvents(EventType.TossDiceAndDealDamage, "Киньте кубик.\nНанесите любому\nмодулю соперника\n(кроме командного)\n1 урон \nпри выпадении ≤4, \nа иначе - 2 урона", 2),
        ...addEvents(EventType.TossDiceAndGetEnergy, "Киньте кубик.\nПри выпадении ≤4\nвозьмите 1 энергию,\nиначе - 2 энергии", 2),
        ...addEvents(EventType.TossDiceAndRepairYourModule, "Киньте кубик.\nМожете восстановить\nодин модуль вашего\nкорабля на 1 урон\nпри выпадении ≤4, \nа иначе - на 2 урона", 2),
        ...addEvents(EventType.DiscardCardAndRepairSpaceship, "Вы можете, скинув до 2\n" +
            "карт с руки,\n" +
            "восстановить по 1 урона\n" +
            "с модулей вашего корабля за каждую\nскинутую карту", 2),
        ...addEvents(EventType.MoveDamage, "Можете перенести\n" +
            "1 урон с\n" +
            "одного вашего модуля\n" +
            "на другой", 2),
        ...addEvents(EventType.ChoosePlayerAndStealHisCard, "Выберите любого игрока,\nу которого на руках есть\nкарточки.\n" +
            "Посмотрите его карты и\nвозьмите себе одну из\nних на ваш выбор", 2),
        ...addEvents(EventType.DiscardCardsAndTakeBuildingCards, "Если у вас есть карты на\nруках, скиньте в сброс до\n" +
            "2 из них на ваш выбор,\n" +
            "а затем возьмите столько\nже карт строительства", 2),
        ...addEvents(EventType.PutTopThreeCardsInAnyOrder, "Положите верхние 3\n" +
            "карточки действия в\n" +
            "произвольном порядке", 2),
        ...addEvents(EventType.PutTopThreeCardsInAnyOrderAndTakeTop, "Положите верхние 3\n" +
            "карточки действия в\n" +
            "произвольном порядке.\n" +
            "Возьмите верхнюю\n" +
            "из них", 2),
        ...addEvents(EventType.SaveCardAndThenAttack, "Сохраните эту карточку\nу себя на руке.\n" +
            "Перед своим ходом\nможете скинуть её и\nнапасть на игрока по\nвашему выбору", 2),
        ...addEvents(EventType.SaveCardAndThenDealDamage, "Сохраните эту карточку\n" +
            "у себя на руке.\n" +
            "В свой бой вы можете\n" +
            "скинуть её,\n" +
            "нанося 1 урон любому\nмодулю корабля\nсоперника\n" +
            "(кроме командного)", 2),
    ];
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

function initPlayers(users: UserInfo[]): Player[] {
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

export function getInitialGameState(users: UserInfo[], settings: GameSettings): GameState {
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