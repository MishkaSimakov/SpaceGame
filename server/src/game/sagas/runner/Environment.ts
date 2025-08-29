import {GameState} from "@common/Types";

import ActionsBus from "../../ActionsBus";

export type Environment = {
    state: GameState
    bus: ActionsBus
}