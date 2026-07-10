import {Card} from "@common/Types";

import {CardShape} from "../shapes/CardShape";
import {Chunk} from "./Chunk";

export type CardLocation = { type: "hand" } | { type: "chunk", chunk: Chunk } | { type: "drag" };

export type CardInfo = {
    shape: CardShape,
    card: Card,
    location: CardLocation
};