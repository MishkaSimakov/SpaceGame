import {Action} from "@common/ActionsHelpers";
import * as Actions from "@common/Actions";

import {Effect, put} from "../runner/Effects";
import {takeType} from "@src/game/sagas/components/TakeSpecific";

type ActionPayload<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>["payload"];

export function* request<Req extends Action<string, any, any>, Res extends keyof typeof Actions>(request: Req, response: Res): Generator<Effect["input"], ActionPayload<Res>, any> {
    yield* put(request);

    const res = yield* takeType(response);

    return res.payload;
}