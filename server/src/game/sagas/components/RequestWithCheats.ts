import * as Actions from "@common/Actions";
import {Action} from "@common/ActionsHelpers";
import {Effect, put, select, take} from "@src/game/sagas/runner/Effects";
import {cheatsPerformers} from "@src/game/sagas/components/CheatsPerformers";

type ActionPayload<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>["payload"];

export function* requestWithCheats<Req extends Action<string, any, any>, Res extends keyof typeof Actions>(request: Req, response: Res): Generator<Effect["input"], ActionPayload<Res>, any> {
    const areCheatsAllowed = (yield* select()).settings.isDebug;

    // TODO: this is bad until io api is edge-triggered
    yield* put(request);

    while (true) {
        const action = yield* take();

        if (action.type === response) {
            return {
                response: action,
                state: yield* select()
            };
        } else if (areCheatsAllowed && action.type.startsWith("cheat")) {
            (cheatsPerformers[action.type as keyof typeof cheatsPerformers] as any)(action);
        }
    }
}