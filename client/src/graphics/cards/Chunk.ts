import {PlayerId, Spaceship, Vector2} from "@common/Types";
import {Group} from "../engine/Group";

export type Chunk = {
    owner: PlayerId,
    spaceship: Spaceship,
    group: Group
};