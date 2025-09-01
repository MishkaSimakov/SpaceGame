// This class is thrown by LossMiddleware when player lost
import {PlayerId} from "@common/Types";

export class LossSignal {
    constructor(
        public readonly player: PlayerId
    ) {
    }
}