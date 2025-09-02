import {AttackReason, MainModuleType, ModuleType} from "@common/Types";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {PlayerGetters} from "@common/getters/Player";
import {StateGetters} from "@common/getters/State";
import {
    beginFight,
    changePlayerEnergy,
    choosePlayerForAttackRequest,
    message, playerUseModuleSecondTime,
    useModuleSecondTimeRequest
} from "@common/Actions";

import {put, select} from "../runner/Effects";
import {request} from "../components/Request";
import {fight} from "../components/Fight";

export function* attack() {
    let state = yield* select();
    let currentPlayer = StateGetters.currentPlayer(state);

    if (!PlayerGetters.canAttack(currentPlayer)) {
        return;
    }

    const {victim} = yield* request(
        choosePlayerForAttackRequest(currentPlayer.id, AttackReason.AttackModule, false),
        'choosePlayerForAttackResponse'
    );

    if (!victim) {
        return;
    }

    const energyCost = SpaceshipGetters.getModulesByType(currentPlayer.spaceship, ModuleType.AttackModule)[0].energyCost;
    yield* put(changePlayerEnergy(currentPlayer.id, -energyCost, "use attack module"));

    yield* put(beginFight(currentPlayer.id, victim, "use attack module"));
    yield* put(message(currentPlayer.id, `напал на ${StateGetters.playerById(state, victim)!.name}, используя абордажный модуль (-${energyCost}⚡)`));
    yield* fight();

    // update state
    state = yield* select();
    currentPlayer = StateGetters.currentPlayer(state);

    if (!currentPlayer.usedModuleSecondTimeOnThisTurn
        && SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.UseModuleSecondTime
        && currentPlayer.energy >= energyCost * 2) {
        const useSecondTime = yield* request(
            useModuleSecondTimeRequest(currentPlayer.id, ModuleType.AttackModule),
            'useModuleSecondTimeResponse'
        );

        if (!useSecondTime) return;

        yield* put(changePlayerEnergy(currentPlayer.id, -energyCost * 2, "use attack module second time"));
        yield* put(playerUseModuleSecondTime(currentPlayer.id));

        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer.id, AttackReason.UsingAttackModuleSecondTime, true),
            'choosePlayerForAttackResponse'
        );

        if (!victim) {
            return;
        }

        yield* put(beginFight(currentPlayer.id, victim, "use attack module second time"));
        yield* put(message(currentPlayer.id, `напал на ${StateGetters.playerById(state, victim)!.name}, используя абордажный модуль второй раз (-${energyCost * 2}⚡)`));
        yield* fight();
    }
}