import {Card, ModuleCard} from "../Types";

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
    }
};