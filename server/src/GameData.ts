import Module from "../../common/modules/Module";
import SpaceSolver from "../../common/modules/SpaceSolver";
import SolarPanel from "../../common/modules/SolarPanel";
import AttackModule from "../../common/modules/AttackModule";
import {Event, EventTypes, addEvents} from "../../common/events/Event";
import {MainModule, MainModuleType} from "../../common/modules/MainModule";
import SmallQuantumProtector from "../../common/modules/SmallQuantumProtector";

import arrayShuffle from "array-shuffle";
import RepairModule from "../../common/modules/RepairModule";

export default class GameData {
    protected readonly none = 0;
    protected readonly red = 1;
    protected readonly blue = 2;

    protected modulesStack: Module[] = [
        new SpaceSolver(1, 0, 1, 0),
        new SpaceSolver(2, 0, 2, 0),
        new SpaceSolver(0, 1, 0, 1),
        new SpaceSolver(0, 2, 0, 2),

        new SmallQuantumProtector(1, 1, 1, 1),

        new SolarPanel(1, 2, 1, 2),
        new SolarPanel(2, 1, 2, 1),
        new SolarPanel(0, 1, 0, 1),
        new SolarPanel(0, 2, 0, 2),
        new SolarPanel(1, 0, 1, 0),
        new SolarPanel(2, 0, 2, 0),

        new RepairModule(1, 1, 1, 1),
        new AttackModule(1, 2, 0, 1),
    ];

    protected eventsStack: Event[] = [
        ...addEvents(EventTypes.TakeOneBuildingCard, "Возьмите 1 карту\nстроительства", 1),
        ...addEvents(EventTypes.TakeTwoBuildingCards, "Возьмите 2 карты\nстроительства", 1),
        ...addEvents(EventTypes.LooseFiveEnergy, "Сбросьте 1 энергию", 1),
        ...addEvents(EventTypes.TakeFiveEnergy, "Получите 1 энергию", 1),
        ...addEvents(EventTypes.SkipNextTurn, "Пропустите ход", 1),
        ...addEvents(EventTypes.LooseAllYourCards, "Скиньте все свои карты", 1),
        ...addEvents(EventTypes.DestroyAnyModuleOnYourSpaceship, "Уничтожьте любой\nмодуль вашего корабля\nна ваш выбор", 1),
        ...addEvents(EventTypes.DestroyTwoSolarPanelsOnYourSpaceship, "Уничтожьте 2 солнечные\nбатареи вашего корабля", 1),
        ...addEvents(EventTypes.AttackRight, "Атакуйте игрока\nсправа от вас", 1),
        ...addEvents(EventTypes.AttackLeft, "Атакуйте игрока\nслева от вас", 1),
        ...addEvents(EventTypes.AttackNextToRight, "Атакуйте игрока\nчерез одного справа\nот вас", 1),
        ...addEvents(EventTypes.AttackNextToLeft, "Атакуйте игрока\nчерез одного слева\nот вас", 1),
        ...addEvents(EventTypes.AttackAny, "Атакуйте игрока\nна ваш выбор", 1),
        ...addEvents(EventTypes.TossDiceAndTakeBuildingCards, "Киньте кубик.\nПри выпадении ≤4\nвозьмите 1 карту\nстроительства,\nиначе - 2 карты\nстроительства", 1),
        ...addEvents(EventTypes.TossDiceAndDealDamage, "Киньте кубик.\nНанесите любому\nмодулю соперника\n(кроме командного)\n1 урон \nпри выпадении ≤4, \nа иначе - 2 урона", 1),
        ...addEvents(EventTypes.TossDiceAndGetEnergy, "Киньте кубик.\nПри выпадении ≤4\nвозьмите 1 энергию,\nиначе - 2 энергии", 1),
        ...addEvents(EventTypes.TossDiceAndRepairYourModule, "Киньте кубик.\nМожете восстановить\nодин модуль вашего корабля на 1 урон\nпри выпадении ≤4, \nа иначе - на 2 урона", 1),
        ...addEvents(EventTypes.DiscardCardAndRepairSpaceship, "Вы можете, скинув до 2\n" +
            "карт с руки,\n" +
            "восстановить по 1 урона\n" +
            "с модулей вашего корабля за каждую\nскинутую карту", 1),
        ...addEvents(EventTypes.MoveDamage, "Можете перенести\n" +
            "1 урон с\n" +
            "одного вашего модуля\n" +
            "на другой", 1),
        ...addEvents(EventTypes.ChoosePlayerAndStealHisCard, "Выберите любого игрока,\nу которого на руках есть карточки.\n" +
            "Посмотрите его карты и\nвозьмите себе одну из\nних на ваш выбор", 1),
        ...addEvents(EventTypes.DiscardCardsAndTakeBuildingCards, "Если у вас есть карты на\nруках, скиньте в сброс до\n" +
            "2 из них на ваш выбор,\n" +
            "а затем возьмите столько\nже карт строительства", 1),
        ...addEvents(EventTypes.PutTopThreeCardsInAnyOrder, "Положите верхние 3\n" +
            "карточки действия в\n" +
            "произвольном порядке", 1),
        ...addEvents(EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop, "Положите верхние 3\n" +
            "карточки действия в\n" +
            "произвольном порядке.\n" +
            "Возьмите верхнюю\n" +
            "из них", 1),
        ...addEvents(EventTypes.SaveCardAndThenAttack, "Сохраните эту карточку\nу себя на руке.\n" +
            "Перед своим ходом\nможете скинуть её и\nнапасть на игрока по\nвашему выбору", 1),
        ...addEvents(EventTypes.SaveCardAndThenDealDamage, "Сохраните эту карточку\n" +
            "у себя на руке.\n" +
            "В свой бой вы можете\n" +
            "скинуть её,\n" +
            "нанося 1 урон любому модулю корабля соперника\n" +
            "(кроме командного)", 1),
    ];

    protected mainModules: MainModule[] = [
        new MainModule(MainModuleType.UseModuleSecondTime),
        new MainModule(MainModuleType.UseModuleSecondTime),
        new MainModule(MainModuleType.UseModuleSecondTime),
        new MainModule(MainModuleType.UseModuleSecondTime),
        new MainModule(MainModuleType.UseModuleSecondTime)
    ];

    protected moduleDiscards: Module[] = [];
    protected eventDiscards: Event[] = [];

    readonly startCardsCount: number = 4;

    constructor() {
        // this.modulesStack = arrayShuffle(this.modulesStack);
        // this.eventsStack = arrayShuffle(this.eventsStack);
        // this.mainModules = arrayShuffle(this.mainModules);
    }


    popMainModule(): MainModule {
        return this.mainModules.pop();
    }

    popModuleCards(count: number = 1): Module[] {
        let cards = this.modulesStack.slice(-count);

        this.modulesStack = this.modulesStack.slice(0, -count);

        return cards;
    }

    popEventCards(count: number = 1): Event[] {
        let cards = this.eventsStack.slice(-count);

        this.eventsStack = this.eventsStack.slice(0, -count);

        return cards;
    }

    pushEventCards(cards: Event[]) {
        this.eventsStack.push(...cards);
    }

    discardCards(cards: (Module | Event)[]) {
        for (let card of cards) {
            if ((card as Module).name === undefined) {
                this.eventDiscards.push(card as Event);
            } else {
                this.moduleDiscards.push(card as Module);
            }
        }
    }
}