import Game from "../Game";
import Module, {isModule} from "../../../../common/modules/Module";
import {Event, EventTypes} from "../../../../common/events/Event";
import Player from "../../../../common/Player";
import {AttackReason, MoveDamageReason} from "../../../../common/Types";
import {MainModuleType} from "../../../../common/modules/MainModule";
import Vector2 from "../../../../common/Vector2";

export const beforeTurn = async (game: Game) => {
    // attack by event card
    if (game.currentPlayer.hand.filter((m) => {
        if (isModule(m))
            return false;

        return (m as Event).type === EventTypes.SaveCardAndThenAttack;
    }).length !== 0) {
        let attackedPlayer: Player | void = await game.choosePlayerForAttack(AttackReason.AttackLaterEventCard);

        if (attackedPlayer) {
            let eventCardIndex: number = game.currentPlayer.hand.findIndex((c) => {
                if (isModule(c)) return false;

                return (c as Event).type === EventTypes.SaveCardAndThenAttack;
            });

            let discardedEventCard = game.currentPlayer.hand.splice(eventCardIndex, 1);
            game.gameData.discardCards(discardedEventCard);

            await game.attackPlayer(attackedPlayer);
        }
    }

    // attack by command module
    if (game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.AttackOrRunaway
        && game.currentPlayer.energy >= game.ENERGY_TO_ATTACK_BY_COMMAND_MODULE) {
        let attackedPlayer: Player | void = await game.choosePlayerForAttack(AttackReason.MainModule);

        if (attackedPlayer) {
            game.currentPlayer.energy -= game.ENERGY_TO_ATTACK_BY_COMMAND_MODULE;

            await game.attackPlayer(attackedPlayer);
        }
    }

    // repair module by command module
    if (game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.MoveDamage
        && game.currentPlayer.energy >= game.ENERGY_TO_MOVE_DAMAGE_BY_COMMAND_MODULE
        && game.currentPlayer.spaceship.hasDamagedModules()) {

        type MoveData = {
            from: Vector2,
            to: Vector2
        }

        let moveDamageData: MoveData = await game.emitToCurrentPlayerAndWait('chooseModulesToMoveDamage', MoveDamageReason.MainModule, (moveDamage?: MoveData) => {
            return moveDamage;
        });

        if (moveDamageData) {
            let moduleToMoveDamageFrom: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.from);
            let moduleToMoveDamageTo: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.to);

            let newHealth = Math.min(moduleToMoveDamageFrom.totalHealth, moduleToMoveDamageFrom.health + 2);

            moduleToMoveDamageTo.health -= newHealth - moduleToMoveDamageFrom.health;
            moduleToMoveDamageFrom.health = newHealth;

            if (moduleToMoveDamageTo.health <= 0) {
                game.currentPlayer.spaceship.removeModule(moduleToMoveDamageTo);

                let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
                game.currentPlayer.spaceship.removeModule(unconnected);

                game.currentPlayer.hand.push(...unconnected);

                moduleToMoveDamageTo.health = moduleToMoveDamageTo.totalHealth;
                game.gameData.discardCards([moduleToMoveDamageTo]);
            }
        }
    }
}
