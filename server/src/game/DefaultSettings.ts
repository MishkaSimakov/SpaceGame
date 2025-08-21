import {GameSettings} from "@common/Types";

export const defaultSettings = {
    isPublic: false,

    startCardsCount: 4,
    mainModuleRunawayEnergyCost: 5,
    energyToAttackByMainModule: 7,
    energyToMoveDamageByMainModule: 4,
    damageMovedByMainModule: 2,
    energyToDragAnotherEventCardByMainModule: 4,
    energyToDragAdditionalCardByMainModule: 15,
    maxCardsOnHand: 5,
    diceResultToRunaway: 4,
} as Omit<GameSettings, "seed">