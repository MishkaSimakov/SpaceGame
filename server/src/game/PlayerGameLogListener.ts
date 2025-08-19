import {Message} from "@common/Types";
import ActionsBus from "./ActionsBus";
import {User} from "../database/entity/user";

export class PlayerGameLogListener {
    messages: Message[] = [];

    constructor(private busRef: ActionsBus, private users: User[]) {
    }

    registerListeners() {
        this.busRef.on('message', ({payload}) => {
            const name = this.users.find(u => u.id === payload.player)!.login;
            this.messages.push({
                text: `${name}: ${payload.text}`
            });
        })
    }
}
