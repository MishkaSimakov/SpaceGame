export type TimeControlSettings = {
    startTime: number;
    defaultTimeIncrease: number;
    fightTimeIncrease: number;
}

export class GameSettings {
    constructor(
        public readonly seed: string,
        public readonly size: number,
        public readonly withTimeControl: boolean,
        public readonly loseWhenTimeout: boolean,
        public readonly isPublic: boolean
    ) {
    }

    timeControlSettings?: TimeControlSettings = undefined;

    startCardsCount = 4;
    mainModuleRunawayEnergyCost = 5;
    energyToAttackByMainModule = 7;
    energyToMoveDamageByMainModule = 4;
    damageMovedByMainModule = 2;
    energyToDragAnotherEventCardByMainModule = 4;
    energyToDragAdditionalCardByMainModule = 15;
    maxCardsOnHand = 5;
    diceResultToRunaway = 4;
}