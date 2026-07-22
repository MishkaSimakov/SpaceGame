import {Card, GameSettings, ModuleCard} from "../Types";
import {mainModulesInfo} from "../cards/Modules";

export const CardGetters = {
    id(card: Card): number {
        if (card.cardType === "event") {
            return card.event.id;
        } else {
            return card.module.id;
        }
    },

    asModule(card: Card): ModuleCard | undefined {
        return card.cardType === "module" ? card.module : undefined;
    },

    /**
     * What the card does beyond the stats printed on it, or nothing when the stats say it all.
     *
     * The text belongs to the module's kind rather than to the card, so it is read from the card
     * data and not from the state the server sends. What it costs, though, belongs to the game:
     * the same command module is worth a different price in a game created with other settings.
     */
    description(card: Card, settings: GameSettings): string | undefined {
        if (card.cardType !== "module" || card.module.mainModuleType === undefined) {
            return undefined;
        }

        return mainModulesInfo[card.module.mainModuleType].description?.(settings);
    }
};