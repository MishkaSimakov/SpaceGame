import {EventType} from "../Types";

export type EventInfo = {
    description: string,
    count: number
};

export const eventsInfo: Record<EventType, EventInfo> = {
    [EventType.TakeOneBuildingCard]: {
        description: "Возьмите 1 карту строительства",
        count: 2
    },
    [EventType.TakeTwoBuildingCards]: {
        description: "Возьмите 2 карты строительства",
        count: 2
    },
    [EventType.LooseFiveEnergy]: {
        description: "Сбросьте 1 энергию",
        count: 2
    },
    [EventType.TakeFiveEnergy]: {
        description: "Получите 1 энергию",
        count: 2
    },
    [EventType.SkipNextTurn]: {
        description: "Пропустите ход",
        count: 2
    },
    [EventType.LooseAllYourCards]: {
        description: "Скиньте все свои карты",
        count: 2
    },
    [EventType.DestroyAnyModuleOnYourSpaceship]: {
        description: "Уничтожьте любой модуль вашего корабля на ваш выбор",
        count: 2
    },
    [EventType.DestroyTwoSolarPanelsOnYourSpaceship]: {
        description: "Уничтожьте 2 солнечные батареи вашего корабля",
        count: 2
    },
    [EventType.AttackRight]: {
        description: "Атакуйте игрока справа от вас",
        count: 2
    },
    [EventType.AttackLeft]: {
        description: "Атакуйте игрока слева от вас",
        count: 2
    },
    [EventType.AttackNextToRight]: {
        description: "Атакуйте игрока через одного справа от вас",
        count: 2
    },
    [EventType.AttackNextToLeft]: {
        description: "Атакуйте игрока через одного слева от вас",
        count: 2
    },
    [EventType.AttackAny]: {
        description: "Атакуйте игрока на ваш выбор",
        count: 2
    },
    [EventType.TossDiceAndTakeBuildingCards]: {
        description: "Киньте кубик. При выпадении ≤4 возьмите 1 карту строительства, иначе - 2 карты строительства",
        count: 2
    },
    [EventType.TossDiceAndDealDamage]: {
        description: "Киньте кубик. Нанесите любому модулю соперника (кроме командного) 1 урон при выпадении ≤4, а иначе - 2 урона",
        count: 2
    },
    [EventType.TossDiceAndGetEnergy]: {
        description: "Киньте кубик. При выпадении ≤4 возьмите 1 энергию, иначе - 2 энергии",
        count: 2
    },
    [EventType.TossDiceAndRepairYourModule]: {
        description: "Киньте кубик. Можете восстановить один модуль вашего корабля на 1 урон при выпадении ≤4, а иначе - на 2 урона",
        count: 2
    },
    [EventType.DiscardCardAndRepairSpaceship]: {
        description: "Вы можете, скинув до 2 карт с руки, восстановить по 1 урона с модулей вашего корабля за каждую скинутую карту",
        count: 2
    },
    [EventType.MoveDamage]: {
        description: "Можете перенести 1 урон с одного вашего модуля на другой",
        count: 2
    },
    [EventType.ChoosePlayerAndStealHisCard]: {
        description: "Выберите любого игрока, у которого на руках есть карточки. Посмотрите его карты и возьмите себе одну из них на ваш выбор",
        count: 2
    },
    [EventType.DiscardCardsAndTakeBuildingCards]: {
        description: "Если у вас есть карты на руках, скиньте в сброс до 2 из них на ваш выбор, а затем возьмите столько же карт строительства",
        count: 2
    },
    [EventType.PutTopThreeCardsInAnyOrder]: {
        description: "Положите верхние 3 карточки действия в произвольном порядке",
        count: 2
    },
    [EventType.PutTopThreeCardsInAnyOrderAndTakeTop]: {
        description: "Положите верхние 3 карточки действия в произвольном порядке. Возьмите верхнюю из них",
        count: 2
    },
    [EventType.SaveCardAndThenAttack]: {
        description: "Сохраните эту карточку у себя на руке. Перед своим ходом можете скинуть её и напасть на игрока по вашему выбору",
        count: 2
    },
    [EventType.SaveCardAndThenDealDamage]: {
        description: "Сохраните эту карточку у себя на руке. В свой бой вы можете скинуть её, нанося 1 урон любому модулю корабля соперника (кроме командного)",
        count: 2
    },
}