import {OtherPlayer} from "../GameForPlayerDTO";
import Player from "../Player";
import {ModuleTypes} from "../modules/Module";

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
    },

    canDamage(player: Player): boolean {
        let weaponCost = player.spaceship.modules.filter(m => m.strength > 0).map(m => m.energyCost);

        if (weaponCost.length === 0) {
            return false;
        }

        return Math.min(...weaponCost) <= player.energy;
    },

    canProtect(player: Player): boolean {
        let protectorCost = player.spaceship.modules.filter(m => m.type === ModuleTypes.QuantumProtector || m.type === ModuleTypes.SmallQuantumProtector)
            .map(m => m.energyCost);

        if (protectorCost.length === 0)
            return false;

        return Math.min(...protectorCost) <= player.energy;
    },
};