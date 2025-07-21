import Module, {isModule} from "../../../common/modules/Module";
import SpaceSolver from "../../../common/modules/SpaceSolver";
import SolarPanel from "../../../common/modules/SolarPanel";
import AttackModule from "../../../common/modules/AttackModule";
import {Event, EventTypes, addEvents} from "../../../common/events/Event";
import {MainModule, MainModuleType} from "../../../common/modules/MainModule";
import SmallQuantumProtector from "../../../common/modules/SmallQuantumProtector";

import RepairModule from "../../../common/modules/RepairModule";
import modules from "./modules";
import DarkMatterGenerator from "../../../common/modules/DarkMatterGenerator";
import QuantumProtector from "../../../common/modules/QuantumProtector";
import NuclearReactor from "../../../common/modules/NuclearReactor";
import SmallBattery from "../../../common/modules/SmallBattery";
import QuantumDestabilizer from "../../../common/modules/QuantumDestabilizer";
import Battery from "../../../common/modules/Battery";
import StructureModule from "../../../common/modules/StructureModule";
import IonDestroyer from "../../../common/modules/IonDestroyer";
import Player, {PlayerId} from "../../../common/Player";

// shuffle array in place
export function arrayShuffle<T>(array: T[]): T[] {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }

    return array;
}

export class FightData {
    first: PlayerId;
    second: PlayerId;

    isFirstPlayerTurn: boolean = true;

    isFightEnded: boolean = false;
}

const moduleName = {
    "dark_matter_generator": DarkMatterGenerator,
    "small_quantum_protector": SmallQuantumProtector,
    "quantum_protector": QuantumProtector,
    "attack_module": AttackModule,
    "solar_panel": SolarPanel,
    "space_solver": SpaceSolver,
    "nuclear_reactor": NuclearReactor,
    "small_battery": SmallBattery,
    "quantum_destabilizer": QuantumDestabilizer,
    "battery": Battery,
    "repair_module": RepairModule,
    "structure_module": StructureModule,
    "ion_destroyer": IonDestroyer,
}

export default class GameState {
    protected modulesStack: Module[] = [];

    protected eventsStack: Event[] = [
        ...addEvents(EventTypes.TakeOneBuildingCard, "Возьмите 1 карту\nстроительства", 2),
        ...addEvents(EventTypes.TakeTwoBuildingCards, "Возьмите 2 карты\nстроительства", 2),
        ...addEvents(EventTypes.LooseFiveEnergy, "Сбросьте 1 энергию", 2),
        ...addEvents(EventTypes.TakeFiveEnergy, "Получите 1 энергию", 2),
        ...addEvents(EventTypes.SkipNextTurn, "Пропустите ход", 2),
        ...addEvents(EventTypes.LooseAllYourCards, "Скиньте все свои карты", 2),
        ...addEvents(EventTypes.DestroyAnyModuleOnYourSpaceship, "Уничтожьте любой\nмодуль вашего корабля\nна ваш выбор", 2),
        ...addEvents(EventTypes.DestroyTwoSolarPanelsOnYourSpaceship, "Уничтожьте 2 солнечные\nбатареи вашего корабля", 2),
        ...addEvents(EventTypes.AttackRight, "Атакуйте игрока\nсправа от вас", 2),
        ...addEvents(EventTypes.AttackLeft, "Атакуйте игрока\nслева от вас", 2),
        ...addEvents(EventTypes.AttackNextToRight, "Атакуйте игрока\nчерез одного справа\nот вас", 2),
        ...addEvents(EventTypes.AttackNextToLeft, "Атакуйте игрока\nчерез одного слева\nот вас", 2),
        ...addEvents(EventTypes.AttackAny, "Атакуйте игрока\nна ваш выбор", 2),
        ...addEvents(EventTypes.TossDiceAndTakeBuildingCards, "Киньте кубик.\nПри выпадении ≤4\nвозьмите 1 карту\nстроительства,\nиначе - 2 карты\nстроительства", 2),
        ...addEvents(EventTypes.TossDiceAndDealDamage, "Киньте кубик.\nНанесите любому\nмодулю соперника\n(кроме командного)\n1 урон \nпри выпадении ≤4, \nа иначе - 2 урона", 2),
        ...addEvents(EventTypes.TossDiceAndGetEnergy, "Киньте кубик.\nПри выпадении ≤4\nвозьмите 1 энергию,\nиначе - 2 энергии", 2),
        ...addEvents(EventTypes.TossDiceAndRepairYourModule, "Киньте кубик.\nМожете восстановить\nодин модуль вашего\nкорабля на 1 урон\nпри выпадении ≤4, \nа иначе - на 2 урона", 2),
        ...addEvents(EventTypes.DiscardCardAndRepairSpaceship, "Вы можете, скинув до 2\n" +
            "карт с руки,\n" +
            "восстановить по 1 урона\n" +
            "с модулей вашего корабля за каждую\nскинутую карту", 2),
        ...addEvents(EventTypes.MoveDamage, "Можете перенести\n" +
            "1 урон с\n" +
            "одного вашего модуля\n" +
            "на другой", 2),
        ...addEvents(EventTypes.ChoosePlayerAndStealHisCard, "Выберите любого игрока,\nу которого на руках есть\nкарточки.\n" +
            "Посмотрите его карты и\nвозьмите себе одну из\nних на ваш выбор", 2),
        ...addEvents(EventTypes.DiscardCardsAndTakeBuildingCards, "Если у вас есть карты на\nруках, скиньте в сброс до\n" +
            "2 из них на ваш выбор,\n" +
            "а затем возьмите столько\nже карт строительства", 2),
        ...addEvents(EventTypes.PutTopThreeCardsInAnyOrder, "Положите верхние 3\n" +
            "карточки действия в\n" +
            "произвольном порядке", 2),
        ...addEvents(EventTypes.PutTopThreeCardsInAnyOrderAndTakeTop, "Положите верхние 3\n" +
            "карточки действия в\n" +
            "произвольном порядке.\n" +
            "Возьмите верхнюю\n" +
            "из них", 2),
        ...addEvents(EventTypes.SaveCardAndThenAttack, "Сохраните эту карточку\nу себя на руке.\n" +
            "Перед своим ходом\nможете скинуть её и\nнапасть на игрока по\nвашему выбору", 2),
        ...addEvents(EventTypes.SaveCardAndThenDealDamage, "Сохраните эту карточку\n" +
            "у себя на руке.\n" +
            "В свой бой вы можете\n" +
            "скинуть её,\n" +
            "нанося 1 урон любому\nмодулю корабля\nсоперника\n" +
            "(кроме командного)", 2),
    ];

    protected mainModules: MainModule[] = [
        new MainModule(1, MainModuleType.DrawAnotherEventCard, {top: 1, right: 1, bottom: 1, left: 2}),
        new MainModule(2, MainModuleType.DrawAdditionalModuleCard, {top: 2, right: 1, bottom: 2, left: 2}),
        new MainModule(3, MainModuleType.MoveDamage, {top: 2, right: 2, bottom: 1, left: 1}),
        new MainModule(4, MainModuleType.UseModuleSecondTime, {top: 2, right: 2, bottom: 2, left: 2}),
        new MainModule(5, MainModuleType.AttackOrRunaway, {top: 1, right: 1, bottom: 1, left: 1})
    ];

    protected moduleDiscards: Module[] = [];
    protected eventDiscards: Event[] = [];

    players: Player[] = [];
    currentPlayerIndex: number = 0;

    fight?: FightData = undefined;

    constructor() {
        for (let module in modules) {
            for (let configuration of modules[module]["configurations"]) {
                this.modulesStack.push(
                    new moduleName[module](configuration[3], configuration[0], configuration[1], configuration[2])
                );
            }
        }

        this.modulesStack = arrayShuffle(this.modulesStack);
        this.eventsStack = arrayShuffle(this.eventsStack);
        this.mainModules = arrayShuffle(this.mainModules);
    }

    getPlayers(): Readonly<Player[]> {
        return Object.freeze(this.players);
    }

    getCurrentPlayer(): Readonly<Player> {
        return Object.freeze(this.players[this.currentPlayerIndex]);
    }

    getCurrentPlayerIndex(): number {
        return this.currentPlayerIndex;
    }

    popMainModule(): MainModule {
        return this.mainModules.pop();
    }

    advanceCurrentPlayer() {
        let currentPlayerIndex = this.currentPlayerIndex;

        while (true) {
            currentPlayerIndex = (currentPlayerIndex + 1) % this.players.length;

            if (this.players[currentPlayerIndex].skipNextTurn) {
                this.players[currentPlayerIndex].skipNextTurn = false;
                continue;
            }

            if (this.players[currentPlayerIndex].isLose()) {
                continue;
            }

            break;
        }

        this.currentPlayerIndex = currentPlayerIndex;
    }

    popModuleCards(count: number = 1): Module[] {
        if (count > this.modulesStack.length) {
            this.moduleDiscards = arrayShuffle(this.moduleDiscards);

            this.modulesStack.unshift(...this.moduleDiscards);
            this.moduleDiscards = [];
        }

        let cards = this.modulesStack.slice(-count);

        this.modulesStack = this.modulesStack.slice(0, -count);

        return cards;
    }

    popEventCards(count: number = 1): Event[] {
        if (count > this.eventDiscards.length) {
            this.eventDiscards = arrayShuffle(this.eventDiscards);

            this.eventsStack.unshift(...this.eventDiscards);
            this.eventDiscards = [];
        }

        let cards = this.eventsStack.slice(-count);

        this.eventsStack = this.eventsStack.slice(0, -count);

        return cards;
    }

    pushEventCards(cards: Event[]) {
        this.eventsStack.push(...cards);
    }

    discardCards(cards: (Module | Event)[]) {
        for (let card of cards) {
            if (isModule(card)) {
                this.moduleDiscards.push(card as Module);
            } else {
                this.eventDiscards.push(card as Event);
            }
        }
    }
}
