import * as Actions from "@common/Actions";
import {GameState} from "@common/Types";
import ActionsBus from "@src/game/ActionsBus";
import {changePlayerEnergy} from "@common/Actions";

type PerformerType<T extends keyof typeof Actions> =
    (cheat: ReturnType<(typeof Actions)[T]>["payload"], state: GameState, bus: ActionsBus) => Promise<void>;

type CheatsPerformersContainer = {
    // TODO: remove optionality
    [Key in keyof typeof Actions as (Key extends `cheat${string}` ? Key : never)]?: PerformerType<Key>
};

export const cheatsPerformers: CheatsPerformersContainer = {
    async cheatChangeEnergy(cheat, state, bus) {
        await bus.emit(changePlayerEnergy(cheat.target, cheat.delta, "cheat"));
    }
}