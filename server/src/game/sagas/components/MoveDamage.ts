import {MoveDamageReason} from "@common/Types";
import {put, select} from "../Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";
import {request} from "./Request";
import {chooseModuleToMoveDamageRequest, chooseModuleToMoveDamageResponse} from "@common/actions/EventCards";
import {changeModuleHealth, changePlayerEnergy} from "@common/actions/Reducer";
import {damageModule} from "./DamageModule";

const reasonDescription = {
    [MoveDamageReason.MainModule]: "move damage by main module",
    [MoveDamageReason.EventCard]: "move damage by event card",
}

export function* moveDamage(reason: MoveDamageReason, energyCost: number, movedDamage: number) {
    const state = yield* select();
    const currentPlayer = state.players[state.currentPlayerIndex];

    if (!SpaceshipGetters.hasDamagedModules(currentPlayer.spaceship)) {
        return;
    }

    const moveDamageData = yield* request(
        chooseModuleToMoveDamageRequest(currentPlayer, reason),
        chooseModuleToMoveDamageResponse
    );

    const {from, to} = moveDamageData;

    if (from && to) {
        yield* put(changePlayerEnergy(currentPlayer, -energyCost, reasonDescription[reason]));

        yield* put(changeModuleHealth(currentPlayer, from, movedDamage, reasonDescription[reason]));
        yield* damageModule(currentPlayer, to, movedDamage, {type: "EventCard"});
    }
}