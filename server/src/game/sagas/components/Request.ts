import {Action} from "@common/ActionsHelpers";
import * as Actions from "@common/Actions"

import {all, Effect, put, take} from "../runner/Effects";

type ActionPayload<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>["payload"];

export function* request<Req extends Action<string, any, any>, Res extends keyof typeof Actions>(request: Req, response: Res): Generator<Effect["input"], ActionPayload<Res>, any> {
    const {req, res} = yield* all({
        req: put(request),
        res: take(response)
    });

    return res.payload;
}