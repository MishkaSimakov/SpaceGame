export class TimeControlSettings {
    START_TIME: number;
    DEFAULT_TIME_INCREASE: number;
    FIGHT_TIME_INCREASE: number;
}

export class GameSettings {
    size: number;
    withTimeControl: boolean;
    timeControlSettings?: TimeControlSettings;
    loseWhenTimeout: boolean;
    isPublic: boolean;
    startCardsCount: number;

    mainModuleRunawayEnergyCost = 5;
    energyToAttackByCommandModule = 7;
    energyToMoveDamageByCommandModule = 4;
    energyToDragAnotherEventCardByMainModule = 4;
    energyToDragAdditionalCardByMainModule = 15;
    maxCardsOnHand = 5;
}