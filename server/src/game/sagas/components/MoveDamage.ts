import {MoveDamageReason} from "@common/Types";
import {put, select} from "../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {request} from "./Request";
import Actions from "@common/actions/Main"
import {damageModule} from "./DamageModule";
import {StateGetters} from "@common/getters/State";

const {chooseModuleToMoveDamageRequest, changePlayerEnergy, changeModuleHealth} = Actions;

const reasonDescription = {
    [MoveDamageReason.MainModule]: "move damage by main module",
    [MoveDamageReason.EventCard]: "move damage by event card",
}

export function* moveDamage(reason: MoveDamageReason, energyCost: number, movedDamage: number) {
    const state = yield* select();
    const currentPlayer = StateGetters.currentPlayer(state);

    if (!SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
        return;
    }

    const move = yield* request(
        chooseModuleToMoveDamageRequest(currentPlayer, reason),
        'chooseModuleToMoveDamageResponse'
    );

    if (!move) {
        return;
    }

    yield* put(changePlayerEnergy(currentPlayer, -energyCost, reasonDescription[reason]));

    yield* put(changeModuleHealth(currentPlayer, move.from, movedDamage, reasonDescription[reason]));
    yield* damageModule(currentPlayer, move.to, movedDamage, {type: "EventCard"});
}