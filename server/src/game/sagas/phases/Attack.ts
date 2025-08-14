import {AttackReason} from "@common/Types";
import {ModuleType} from "@common/modules/Module";
import {MainModuleType} from "@common/modules/MainModule";
import {StateGetters} from "@common/getters/State";
import {PlayerGetters} from "@common/getters/Player";
import Actions from "@common/actions/Main";
import {SpaceshipGetters} from "@common/getters/Spaceship";

import {put, select} from "../Effects";
import {request} from "../components/Request";
import {fight} from "../components/Fight";

const {
    beginFight,
    changePlayerEnergy,
    choosePlayerForAttackRequest,
    playerUseModuleSecondTime,
    useModuleSecondTimeRequest,
} = Actions;

export function* attack() {
    let state = yield* select();
    let currentPlayer = StateGetters.currentPlayer(state);

    if (!PlayerGetters.canAttack(currentPlayer)) {
        return;
    }

    const {victim} = yield* request(
        choosePlayerForAttackRequest(currentPlayer, AttackReason.AttackModule, false),
        'choosePlayerForAttackResponse'
    );

    if (!victim) {
        return;
    }

    const energyCost = SpaceshipGetters.getModulesByType(currentPlayer.spaceship, ModuleType.AttackModule)[0].energyCost;
    yield* put(changePlayerEnergy(currentPlayer, -energyCost, "use attack module"));

    yield* put(beginFight(currentPlayer.id, victim, "use attack module"));
    yield* put(Actions.message(currentPlayer, `напал на ${StateGetters.playerById(state, victim)!.name}, используя абордажный модуль (-${energyCost}⚡)`));
    yield* fight();

    // update state
    state = yield* select();
    currentPlayer = StateGetters.currentPlayer(state);

    if (!currentPlayer.usedModuleSecondTimeOnThisTurn
        && SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.UseModuleSecondTime
        && currentPlayer.energy >= energyCost * 2) {
        const useSecondTime = yield* request(
            useModuleSecondTimeRequest(currentPlayer, ModuleType.AttackModule),
            'useModuleSecondTimeResponse'
        );

        if (!useSecondTime) return;

        yield* put(changePlayerEnergy(currentPlayer, -energyCost * 2, "use attack module second time"));
        yield* put(playerUseModuleSecondTime(currentPlayer));

        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer, AttackReason.UsingAttackModuleSecondTime, true),
            'choosePlayerForAttackResponse'
        );

        if (!victim) {
            return;
        }

        yield* put(beginFight(currentPlayer.id, victim, "use attack module second time"));
        yield* put(Actions.message(currentPlayer, `напал на ${StateGetters.playerById(state, victim)!.name}, используя абордажный модуль второй раз (-${energyCost * 2}⚡)`));
        yield* fight();
    }
}