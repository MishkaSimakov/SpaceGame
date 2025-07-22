import {OtherPlayer} from "../GameForPlayerDTO";
import Player from "../Player";

export const PlayerGetters = {
    forOtherPlayer(player: Player): OtherPlayer {
        const otherPlayer = new OtherPlayer();

        otherPlayer.id = player.id;
        otherPlayer.name = player.name;
        otherPlayer.energy = player.energy;
        otherPlayer.online = player.online;
        otherPlayer.spaceship = player.spaceship;
        otherPlayer.handSize = player.hand.length;

        return otherPlayer;
    }
};