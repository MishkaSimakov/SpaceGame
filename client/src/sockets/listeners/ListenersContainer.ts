import Actions from "@common/actions/Main";

import Game from "../../Game";
import SocketManager from "../SocketManager";

type ReplaceRequestWithResponse<T extends string> =
    T extends `${infer Prefix}Request` ? `${Prefix}Response` : T;

type Services = { sockets: SocketManager, game: Game };

type ListenerReturnType<T extends keyof typeof Actions> = T extends `${infer _Prefix}Request`
    ? Promise<ReturnType<(typeof Actions)[ReplaceRequestWithResponse<T>]>>
    : Promise<void>;

export type ListenersContainer = {
    [Key in keyof typeof Actions]?:
    typeof Actions[Key] extends (...args: any[]) => { type: string, payload?: infer P }
        ? (payload: P, services: Services) => ListenerReturnType<Key>
        : never
};