import {OtherPlayer} from "../GameForPlayerDTO";
import Player from "../Player";
import {ModuleType} from "../modules/ModuleCard";
import Spaceship from "../Spaceship";
import {SpaceshipGetters} from "./Spaceship";

export const PlayerGetters = {
    forOtherPlayer(player: Player): OtherPlayer {
        return {
            id: player.id,
            name: player.name,
            energy: player.energy,
            spaceship: player.spaceship,
            handSize: player.hand.length,
            lose: player.lose
        };
    },

    canAttack(player: Player): boolean {
        const modules = SpaceshipGetters.getModulesByType(player.spaceship, ModuleType.AttackModule);

        if (modules.length === 0) {
            return false;
        }

        return Math.min(...modules.map(m => m.energyCost)) <= player.energy;
    },

    canDamage(player: Player): boolean {
        let weaponCost = player.spaceship.modules.filter(m => m.strength > 0).map(m => m.energyCost);

        if (weaponCost.length === 0) {
            return false;
        }

        return Math.min(...weaponCost) <= player.energy;
    },

    canProtect(player: Player): boolean {
        let protectorCost = player.spaceship.modules.filter(m => m.type === ModuleType.QuantumProtector || m.type === ModuleType.SmallQuantumProtector)
            .map(m => m.energyCost);

        if (protectorCost.length === 0)
            return false;

        return Math.min(...protectorCost) <= player.energy;
    },
};