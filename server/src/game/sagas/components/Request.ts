import {Action, ActionConstructor, ActionOf, ActionStub} from "@common/actions/Action";
import {all, put, take} from "../Effects";

export function* request<Req extends ActionStub, Res extends ActionConstructor>(request: Req, response: Res) {
    const {req, res} = yield* all({
        req: put(request),
        res: take(response)
    });

    return (res as ActionOf<Res>).payload;
}