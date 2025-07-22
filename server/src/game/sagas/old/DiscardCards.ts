import Game from "../../Game";

export const discardCards = async (game: Game) => {
    if (game.currentPlayer.hand.length <= 5) {
        return;
    }

    console.log("   Player asked to discard cards");

    const discardedCardsIndexes: number[] = await game.emitToCurrentPlayerAndWaitAcknowledgment('discardCards');

    console.log(`   Player discarded cards with indexes ${discardedCardsIndexes.join(', ')}`);

    if (game.currentPlayer.hand.length - discardedCardsIndexes.length > 5)
        throw new Error('Player discarded not enough cards')

    let discardedCards = discardedCardsIndexes.map((index) => {
        return game.currentPlayer.hand[index];
    })

    for (let discardedCard of discardedCards) {
        game.currentPlayer.hand = game.currentPlayer.hand.filter((c) => c !== discardedCard);
    }

    game.gameData.discardCards(discardedCards);

    game.changePlayerData(game.currentPlayer);
}
