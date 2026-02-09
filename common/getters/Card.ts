import {Card} from "../Types";

export const CardGetters = {
    id(card: Card): number {
        if (card.cardType === "event") {
            return card.event.id;
        } else {
            return card.module.id;
        }
    }
};