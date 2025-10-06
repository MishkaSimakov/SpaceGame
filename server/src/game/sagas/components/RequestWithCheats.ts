import * as Actions from "@common/Actions";
import {Action} from "@common/ActionsHelpers";
import {Effect, put, select, take} from "@src/game/sagas/runner/Effects";
import {cheatsPerformers} from "@src/game/sagas/components/CheatsPerformers";
import {deactivateSignal, playerTimeoutSignal} from "@src/game/sagas/runner/Signals";
import {GameState} from "@common/Types";

type ActionPayload<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>["payload"];

export function* requestWithCheats<Req extends Action<string, any, any>, Res extends keyof typeof Actions>(request: Req, response: Res): Generator<Effect["input"], {
    response: ActionPayload<Res>,
    state: GameState
}, any> {
    const areCheatsAllowed = (yield* select()).settings.isDebug;

    yield* put(request);

    while (true) {
        const message = yield* take();

        if (message === playerTimeoutSignal || message === deactivateSignal) {
            throw message;
        } else if (message.type === response) {
            return {
                response: message.payload,
                state: yield* select()
            };
        } else if (areCheatsAllowed && message.type.startsWith("cheat")) {
            yield* (cheatsPerformers[message.type as keyof typeof cheatsPerformers] as any)(message.payload);
        }
    }
}