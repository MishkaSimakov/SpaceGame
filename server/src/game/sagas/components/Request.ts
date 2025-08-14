import {Action} from "@common/actions/Action";
import Actions from "@common/actions/Main"

import {all, Effect, put, take} from "../Effects";

type ActionPayload<T extends keyof typeof Actions> = ReturnType<(typeof Actions)[T]>["payload"];

export function* request<Req extends Action<string, any, any>, Res extends keyof typeof Actions>(request: Req, response: Res): Generator<Effect["input"], ActionPayload<Res>, any> {
    const {req, res} = yield* all({
        req: put(request),
        res: take(response)
    });

    return res.payload;
}