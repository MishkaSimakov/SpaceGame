import {ModuleCard, PlayerId} from "@common/Types";

import {CardShape} from "../shapes/CardShape";
import {CardId} from "./model/Board";

/**
 * A module on the field, as the view sees it.
 *
 * Where the card *is* lives in the board model; this is only what the selection and event code needs
 * in order to talk about one: its identity, and the shape standing for it on screen.
 */
export type FieldCard = {
    id: CardId,
    module: ModuleCard,
    player: PlayerId,
    shape: CardShape
};
