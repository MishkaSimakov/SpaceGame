import Module from "../common/modules/Module";
import SpaceSolver from "../common/modules/SpaceSolver";
import SolarPanel from "../common/modules/SolarPanel";
import AttackModule from "../common/modules/AttackModule";
import {Event, EventTypes, addEvents} from "../common/events/Event";
import MainModule from "../common/modules/MainModule";
import SmallQuantumProtector from "../common/modules/SmallQuantumProtector";

import arrayShuffle from "array-shuffle";

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

        new AttackModule(1, 1, 1, 1),
    ];

    protected eventsStack: Event[] = [
        ...addEvents(EventTypes.PutTopThreeCardsInAnyOrder, "Положите верхние 3 карточки действия в произвольном порядке", 2),
        ...addEvents(EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop, "Положите верхние 3 карточки действия в произвольном порядке. Возьмите верхнюю из них", 2),
        ...addEvents(EventTypes.TakeOneBuildingCard, "Возьмите 1 карту строительства", 2),
        ...addEvents(EventTypes.TakeTwoBuildingCards, "Возьмите 2 карты строительства", 2),
        ...addEvents(EventTypes.LooseFiveEnergy, "Сбросьте 5 энергии", 2),
        ...addEvents(EventTypes.TakeFiveEnergy, "Получите 5 энергии", 2),
        ...addEvents(EventTypes.SkipNextTurn, "Пропустите следующий ход", 2),
        ...addEvents(EventTypes.LooseAllYourCards, "Скиньте все свои карты", 2),
        ...addEvents(EventTypes.DestroyAnyModuleOnYourSpaceship, "Уничтожьте любой модуль вашей станции на ваш выбор", 2),
        ...addEvents(EventTypes.DestroyTwoSolarPanelsOnYourSpaceship, "Уничтожьте 2 солнечные батареи вашей станции", 2),
        ...addEvents(EventTypes.AttackRight, "Атакуйте игрока справа от вас", 2),
        ...addEvents(EventTypes.AttackLeft, "Атакуйте игрока слева от вас", 2),
        ...addEvents(EventTypes.AttackNextToRight, "Атакуйте игрока через одного справа от вac", 1),
        ...addEvents(EventTypes.AttackNextToLeft, "Атакуйте игрока через одного слева от ваc", 1),
        ...addEvents(EventTypes.AttackAny, "Атакуйте игрока на ваш выбор", 1),
        ...addEvents(EventTypes.TossDiceAndTakeBuildingCards, "Киньте кубик. При выпадении <= 4 возьмите 1 карту строительства, иначе - 2 карты строительства (2)\n", 2),
        ...addEvents(EventTypes.TossDiceAndDealDamage, "Киньте кубик. При выпадении <= 4 нанесите 2 урона, иначе - 4 урона", 1),
        ...addEvents(EventTypes.TossDiceAndGetEnergy, "Киньте кубик. При выпадении <= 4 возьмите 5 энергии, иначе - 10 энергии", 2),
        ...addEvents(EventTypes.TossDiceAndRepairYourModule, "Киньте кубик. Можете восстановить один модуль вашей станции на столько урона, сколько выпало на кубике", 2),
        ...addEvents(EventTypes.SaveCardAndThenAttack, "Сохраните эту карточку у себя на руке. Перед своим ходом можете скинуть её и напасть на игрока по вашему выбору", 2),
        ...addEvents(EventTypes.SaveCardAndThenDealDamage, "Сохраните эту карточку у себя на руке. В бою вы можете скинуть её, нанося 2 урона любому модулю соперника на ваш выбор", 2),
        ...addEvents(EventTypes.ChoosePlayerAndStealHisCard, "Выберите любого игрока, у которого на руках есть карточки. Возьмите себе одну из его карточек на ваш выбор", 2),
        ...addEvents(EventTypes.DiscardCardAndRepairSpaceship, "Вы можете, скинув 2 карты с руки, восстановить по 2 урона с 2 модулей на ваш выбор", 3),
        ...addEvents(EventTypes.MoveDamage, "Перенесите до 2-х урона с одного вашего модуля на другой", 2),
        ...addEvents(EventTypes.DiscardCardsAndTakeBuildingCards, "Если у вас есть карты на руках, скиньте в сброс до 2-х карт из них на ваш выбор, а затем возьмите столько же карт строительства", 2),
    ];

    protected mainModules: MainModule[] = [
        new MainModule(),
        new MainModule(),
        new MainModule(),
        new MainModule(),
        new MainModule()
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

    popModuleCards(count: number): Module[] {
        let cards = this.modulesStack.slice(-count);

        this.modulesStack = this.modulesStack.slice(0, -count);

        return cards;
    }

    popEventCard(): Event {
        return this.eventsStack.pop();
    }

    discardCards(cards: (Module|Event)[]) {
        for (let card of cards) {
            if ((card as Module).name === undefined) {
                this.eventDiscards.push(card as Event);
            } else {
                this.moduleDiscards.push(card as Module);
            }
        }
    }
}