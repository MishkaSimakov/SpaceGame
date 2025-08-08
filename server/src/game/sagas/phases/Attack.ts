import {AttackReason} from "@common/Types";
import {ModuleType} from "@common/modules/Module";
import {MainModuleType} from "@common/modules/MainModule";
import {put, select} from "../Effects";
import {StateGetters} from "@common/getters/State";
import {PlayerGetters} from "@common/getters/Player";
import {request} from "../components/Request";
import {
    beginFight,
    changePlayerEnergy,
    choosePlayerForAttackRequest,
    choosePlayerForAttackResponse, playerUseModuleSecondTime,
    useModuleSecondTimeRequest,
    useModuleSecondTimeResponse
} from "@common/actions/Main";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {fight} from "../components/Fight";

export function* attack() {
    let state = yield* select();
    let currentPlayer = StateGetters.currentPlayer(state);

    if (!PlayerGetters.canAttack(currentPlayer)) {
        return;
    }

    const {victim} = yield* request(
        choosePlayerForAttackRequest(currentPlayer, AttackReason.AttackModule),
        choosePlayerForAttackResponse
    );

    if (!victim) {
        return;
    }

    const energyCost = SpaceshipGetters.getModulesByType(currentPlayer.spaceship, ModuleType.AttackModule)[0].energyCost;
    yield* put(changePlayerEnergy(currentPlayer, -energyCost, "use attack module"));

    yield* put(beginFight(currentPlayer.id, victim, "use attack module"));
    yield* fight();

    // update state
    state = yield* select();
    currentPlayer = StateGetters.currentPlayer(state);

    if (!currentPlayer.usedModuleSecondTimeOnThisTurn
        && SpaceshipGetters.getMainModuleType(currentPlayer.spaceship) === MainModuleType.UseModuleSecondTime
        && currentPlayer.energy >= energyCost * 2) {
        const useSecondTime = yield* request(
            useModuleSecondTimeRequest(currentPlayer, ModuleType.AttackModule),
            useModuleSecondTimeResponse
        );

        if (!useSecondTime) return;

        yield* put(changePlayerEnergy(currentPlayer, -energyCost * 2, "use attack module second time"));
        yield* put(playerUseModuleSecondTime(currentPlayer));

        const {victim} = yield* request(
            choosePlayerForAttackRequest(currentPlayer, AttackReason.UsingAttackModuleSecondTime),
            choosePlayerForAttackResponse
        );

        if (!victim) {
            throw new Error('Attacked player is undefined in UsingAttackModuleSecondTime');
        }

        yield* put(beginFight(currentPlayer.id, victim, "use attack module second time"));
        yield* fight();
    }
}