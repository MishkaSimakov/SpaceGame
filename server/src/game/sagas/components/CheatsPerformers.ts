import * as Actions from "@common/Actions";
import {changePlayerEnergy} from "@common/Actions";
import {put, SagaGenerator} from "@src/game/sagas/runner/Effects";

type PerformerType<T extends keyof typeof Actions> =
    (cheat: ReturnType<(typeof Actions)[T]>["payload"]) => SagaGenerator;

type CheatsPerformersContainer = {
    // TODO: remove optionality
    [Key in keyof typeof Actions as (Key extends `cheat${string}` ? Key : never)]?: PerformerType<Key>
};

export const cheatsPerformers: CheatsPerformersContainer = {
    * cheatChangeEnergy(cheat) {
        yield* put(changePlayerEnergy(cheat.target, cheat.delta, "cheat"));
    },
}