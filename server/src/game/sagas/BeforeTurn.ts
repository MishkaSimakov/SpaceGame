import {isModule} from "../../../../common/modules/Module";
import {Event, EventTypes} from "../../../../common/events/Event";
import {AttackReason} from "../../../../common/Types";

import {fight} from "./old/Fight";
import {all, put, select, take} from "../Effects";
import {choosePlayerForAttackRequest, choosePlayerForAttackResponse, useAttackLaterEventCard} from "../actions/Actions";

export function* beforeTurn() {
    const state = yield* select();
    const currentPlayer = state.players[state.currentPlayerIndex];

    // attack by event card
    let attackLaterCardIndex: number = currentPlayer.hand
        .findIndex((c) => {
            if (isModule(c)) return false;

            return (c as Event).type === EventTypes.SaveCardAndThenAttack;
        });

    if (attackLaterCardIndex !== -1) {
        const {req, res} = yield* all({
            req: put(choosePlayerForAttackRequest(currentPlayer.id, AttackReason.MainModule)),
            res: take(choosePlayerForAttackResponse)
        });

        if (res.payload.victim) {
            yield* put(useAttackLaterEventCard(currentPlayer.id, res.payload.victim));
            yield* fight();
        }
    }

    // TODO: uncomment
    // attack by command module
    // if (state.getCurrentPlayer().spaceship.getMainModuleType() === MainModuleType.AttackOrRunaway
    //     && state.getCurrentPlayer().energy >= settings.energyToAttackByCommandModule) {
    //     let attackedPlayer: Player | void = await game.choosePlayerForAttack(AttackReason.MainModule);
    //
    //     if (attackedPlayer) {
    //         bus.emit('useCommandModuleToAttack', {
    //
    //         });
    //         // game.currentPlayer.energy -= settings.energyToAttackByCommandModule;
    //
    //         await fight(state, settings, bus);
    //     }
    // }
    //
    // // repair module by command module
    // if (game.currentPlayer.spaceship.getMainModuleType() === MainModuleType.MoveDamage
    //     && game.currentPlayer.energy >= game.ENERGY_TO_MOVE_DAMAGE_BY_COMMAND_MODULE
    //     && game.currentPlayer.spaceship.hasDamagedModules()) {
    //
    //     type MoveData = {
    //         from: Vector2,
    //         to: Vector2
    //     }
    //
    //     let moveDamageData: MoveData | undefined = await game.emitToCurrentPlayerAndWaitAcknowledgment('chooseModulesToMoveDamage', MoveDamageReason.MainModule);
    //
    //     if (moveDamageData === undefined) {
    //         return;
    //     }
    //
    //     let moduleToMoveDamageFrom: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.from);
    //     let moduleToMoveDamageTo: Module = game.currentPlayer.spaceship.getModuleByPosition(moveDamageData.to);
    //
    //     let newHealth = Math.min(moduleToMoveDamageFrom.totalHealth, moduleToMoveDamageFrom.health + 2);
    //
    //     moduleToMoveDamageTo.health -= newHealth - moduleToMoveDamageFrom.health;
    //     moduleToMoveDamageFrom.health = newHealth;
    //
    //     if (moduleToMoveDamageTo.health <= 0) {
    //         game.currentPlayer.spaceship.removeModule(moduleToMoveDamageTo);
    //
    //         let unconnected = game.currentPlayer.spaceship.getUnconnectedModules();
    //         game.currentPlayer.spaceship.removeModule(unconnected);
    //
    //         game.currentPlayer.hand.push(...unconnected);
    //
    //         moduleToMoveDamageTo.health = moduleToMoveDamageTo.totalHealth;
    //         game.gameData.discardCards([moduleToMoveDamageTo]);
    //     }
    // }
}
