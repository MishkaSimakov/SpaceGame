import {
    Card,
    EventCard,
    EventType,
    GameSettings,
    GameState,
    ModuleCard,
    ModuleType, Player,
    PlayerId,
    Spaceship
} from "@common/Types";

import {User} from "../database/entity/user";
import modulesInfo from "./ModulesInfo";

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

function getInitialModulesStack(): ModuleCard[] {
    let idCounter = 0;
    const modules: ModuleCard[] = [];

    for (let [type, info] of Object.entries(modulesInfo)) {
        for (let configuration of info.configurations) {
            modules.push({
                id: idCounter++,
                name: info.name,
                connectors: configuration,
                strength: info.strength ?? 0,
                capacity: info.capacity ?? 0,
                energyCost: info.energyCost ?? 0,
                energyIncrease: info.energyIncrease ?? 0,
                type: type as ModuleType,
                totalHealth: info.health,
                health: info.health,
                x: 0,
                y: 0,
                rotation: 0,
            });
        }
    }

    return modules;
}

function initPlayers(users: User[]): Player[] {
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
    }))
}

export function getInitialGameState(users: User[], settings: GameSettings): GameState {
    return {
        stack: {
            module: getInitialModulesStack(),
            event: getInitialEventsStack()
        },
        discards: {
            module: [],
            event: []
        },
        players: initPlayers(users),
        currentPlayerId: users[0].id,
        settings,
        timeRecords: []
    };
}