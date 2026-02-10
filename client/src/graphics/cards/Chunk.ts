import {PlayerId, Spaceship, Vector2} from "@common/Types";
import {Group} from "../engine/Group";
import {Line} from "../engine/shapes/Line";

export type Chunk = {
    owner: PlayerId,
    spaceship: Spaceship,
    group: Group,
    outline: Line[]
};