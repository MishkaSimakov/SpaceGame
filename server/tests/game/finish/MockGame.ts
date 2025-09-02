import {GameSettings} from "@common/Types";

import {IUser} from "@src/game/interfaces/IUser";
import {defaultSettings} from "@src/game/DefaultSettings";
import {MockSocketsManager} from "./MockSocketsManager";
import {MockActionsStorage} from "./MockActionsStorage";
import {MockClock} from "./MockClock";
import Game from "@src/game/Game";

export function mockGame(usersCount: number, partialSettings: Partial<GameSettings> = {}) {
    const users: IUser[] = [];
    for (let i = 0; i < usersCount; ++i) {
        users.push({
            id: i,
            login: String(i)
        });
    }

    const settings: GameSettings = {
        ...partialSettings,
        ...defaultSettings,
        seed: "abracadabra"
    };

    const sockets = new MockSocketsManager();
    const storage = new MockActionsStorage();
    const clock = new MockClock();

    return {
        game: new Game(users, settings, sockets, storage, clock),
        sockets,
        storage,
        clock
    };
}