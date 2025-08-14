import {action} from "./ActionConstructors";
import Player from "../Player";

export default {
    ...action('message', (player: Player, text: string) => ({
        payload: {
            text,
            player: player.id
        }
    })),
}