import {Action} from "@common/ActionsHelpers";

import {Middleware} from "../ActionsBus";
import {DeactivateSignal} from "./DeactivateSignal";

export class DeactivateMiddleware extends Middleware {
    constructor(
        private readonly stopToken: { shouldStop: boolean }
    ) {
        super();
    }

    apply(action: Action<string, any, any>): Action<string, any, any> | undefined {
        if (this.stopToken.shouldStop) {
            throw new DeactivateSignal();
        }

        return action;
    }
}