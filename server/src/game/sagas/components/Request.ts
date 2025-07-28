import {Action} from "../../actions/Action";
import {all, put, take} from "../../Effects";

export function* request<Req extends Action, Res extends Action>(request: Req, response: (...args: any[]) => Res) {
    const {req, res} = yield* all({
        req: put(request),
        res: take(response)
    });

    return res.payload as Res["payload"];
}