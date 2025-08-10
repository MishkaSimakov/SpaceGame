import Module from "@common/modules/Module";
import {Event, EventTypes, addEvents} from "@common/events/Event";
import {MainModule, MainModuleType} from "@common/modules/MainModule";

import modules from "./modules";

import SpaceSolver from "@common/modules/SpaceSolver";
import SolarPanel from "@common/modules/SolarPanel";
import AttackModule from "@common/modules/AttackModule";
import SmallQuantumProtector from "@common/modules/SmallQuantumProtector";
import RepairModule from "@common/modules/RepairModule";
import DarkMatterGenerator from "@common/modules/DarkMatterGenerator";
import QuantumProtector from "@common/modules/QuantumProtector";
import NuclearReactor from "@common/modules/NuclearReactor";
import SmallBattery from "@common/modules/SmallBattery";
import QuantumDestabilizer from "@common/modules/QuantumDestabilizer";
import Battery from "@common/modules/Battery";
import StructureModule from "@common/modules/StructureModule";
import IonDestroyer from "@common/modules/IonDestroyer";

import Player, {PlayerId} from "@common/Player";
import {GameSettings} from "@common/GameSettings";

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

const initialEventsStack = [
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

export enum TimeRecordType {
    DEFAULT_TURN_STARTED,
    DEFAULT_TURN_ENDED,

    // before fight start
    DEFAULT_TURN_INTERRUPTED,

    // after fight end
    DEFAULT_TURN_CONTINUED,

    FIGHT_TURN_STARTED,
    FIGHT_TURN_ENDED,

    PAUSE_STARTED,
    PAUSE_ENDED
}

export type TimeRecord = {
    type: TimeRecordType,
    playerId: PlayerId,
    time: number
};

export default class GameState {
    stack = {
        module: [] as Module[],
        event: [] as Event[]
    };
    discards = {
        module: [] as Module[],
        event: [] as Event[]
    };

    mainModules: MainModule[] = [
        new MainModule(1, MainModuleType.DrawAnotherEventCard, {top: 1, right: 1, bottom: 1, left: 2}),
        new MainModule(2, MainModuleType.DrawAdditionalModuleCard, {top: 2, right: 1, bottom: 2, left: 2}),
        new MainModule(3, MainModuleType.MoveDamage, {top: 2, right: 2, bottom: 1, left: 1}),
        new MainModule(4, MainModuleType.UseModuleSecondTime, {top: 2, right: 2, bottom: 2, left: 2}),
        new MainModule(5, MainModuleType.AttackOrRunaway, {top: 1, right: 1, bottom: 1, left: 1})
    ];

    players: Player[] = [];
    currentPlayerIndex: number = 0;

    fight?: FightData = undefined;

    settings: GameSettings;

    timeRecords: TimeRecord[] = [];

    constructor() {
        for (let module in modules) {
            for (let configuration of modules[module]["configurations"]) {
                this.stack["module"].push(
                    new moduleName[module](configuration[3], configuration[0], configuration[1], configuration[2])
                );
            }
        }

        this.stack.event = initialEventsStack;
    }
}
