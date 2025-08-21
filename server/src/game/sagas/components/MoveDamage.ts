import {MoveDamageReason} from "@common/Types";
import {StateGetters} from "@common/getters/State";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {changeModuleHealth, changePlayerEnergy, chooseModuleToMoveDamageRequest} from "@common/Actions";

import {put, select} from "../Effects";
import {request} from "./Request";
import {damageModule} from "./DamageModule";

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

    const {move} = yield* request(
        chooseModuleToMoveDamageRequest(currentPlayer.id, reason),
        'chooseModuleToMoveDamageResponse'
    );

    if (!move) {
        return;
    }

    yield* put(changePlayerEnergy(currentPlayer.id, -energyCost, reasonDescription[reason]));

    yield* put(changeModuleHealth(currentPlayer.id, move.from, movedDamage, reasonDescription[reason]));
    yield* damageModule(currentPlayer, move.to, movedDamage, {type: "EventCard"});
}