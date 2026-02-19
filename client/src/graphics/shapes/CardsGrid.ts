import {Card} from "@common/Types";

import {Group} from "../engine/Group";
import {CardShape} from "./CardShape";

export function getCardsGrid(cards: Card[], maxWidth: number, maxHeight: number) {
    const maxCardsInRow = 6;

    const maxCardSize = Math.min(maxWidth, maxHeight) * 0.75;
    const spaceAvailable = Math.max(maxWidth, maxHeight) * 0.75;
    const spaceBetween = 20;

    const cardSize = Math.min(maxCardSize, (spaceAvailable + spaceBetween) / Math.min(cards.length, maxCardsInRow) - spaceBetween);

    const cardShapes = new Group();

    for (let i = 0; i < cards.length; ++i) {
        let row = Math.floor(i / 6);
        let col = i % 6;

        // rows and cols are swapped when width is less than height
        if (maxWidth < maxHeight) {
            [row, col] = [col, row];
        }

        cardShapes.add(
            new CardShape({
                x: (spaceBetween + cardSize) * col,
                y: (spaceBetween + cardSize) * row,
                size: cardSize,
                card: cards[i]
            })
        );
    }

    cardShapes
        .setPosition({
            x: (maxWidth - cardShapes.getWidth()) / 2,
            y: (maxHeight - cardShapes.getHeight()) / 2
        });

    return cardShapes;
}