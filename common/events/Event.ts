import Module from "../modules/Module";

enum EventTypes {
    PutTopThreeCardsInAnyOrder,
    PutTopThreeCardsInAnyOrderAndTakeTop,
    TakeOneBuildingCard,
    TakeTwoBuildingCards,
    LooseFiveEnergy,
    TakeFiveEnergy,
    SkipNextTurn,
    LooseAllYourCards,
    DestroyAnyModuleOnYourSpaceship,
    DestroyTwoSolarPanelsOnYourSpaceship,
    AttackRight,
    AttackLeft,
    AttackNextToRight,
    AttackNextToLeft,
    AttackAny,
    TossDiceAndTakeBuildingCards,
    TossDiceAndDealDamage,
    TossDiceAndGetEnergy,
    TossDiceAndRepairYourModule,
    SaveCardAndThenAttack,
    SaveCardAndThenDealDamage,
    ChoosePlayerAndStealHisCard,
    DiscardCardAndRepairSpaceship,
    MoveDamage,
    DiscardCardsAndTakeBuildingCards,
}

class Event {
    type: EventTypes;
    description: string;

    constructor(type: EventTypes, description: string) {
        this.type = type;
        this.description = description;
    }

    toString(): string {
        return this.description;
    }
}

function addEvents(type: EventTypes, description: string, count: number): Event[] {
    let events: Event[] = [];

    for (let i = 0; i < count; i++)
        events.push(new Event(type, description));

    return events;
}

function isEvent(card: Module | Event): card is Event {
    return (card as Module).name === undefined;
}

export {EventTypes, Event, addEvents, isEvent};
