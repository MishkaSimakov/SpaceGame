export class TimeControlSettings {
    startTime: number;
    defaultTimeIncrease: number;
    fightTimeIncrease: number;
}

export class GameSettings {
    seed: string;

    size: number;
    withTimeControl: boolean;
    timeControlSettings?: TimeControlSettings;
    loseWhenTimeout: boolean;
    isPublic: boolean;

    startCardsCount: number = 4;
    mainModuleRunawayEnergyCost = 5;
    energyToAttackByMainModule = 7;
    energyToMoveDamageByMainModule = 4;
    damageMovedByMainModule = 2;
    energyToDragAnotherEventCardByMainModule = 4;
    energyToDragAdditionalCardByMainModule = 15;
    maxCardsOnHand = 5;
    diceResultToRunaway = 4;
}