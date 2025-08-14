import Player from "@common/Player";
import {Message} from "@common/Types";


export default class MessageManager {
    messages: Message[] = [];

    constructor() {
    }

    addMessage(text: string, player?: Player) {
        this.messages.push({
            id: this.messages.length,
            playerId: player?.id,
            text: text,
            time: (new Date()).getTime()
        });
    }
};
