import Module from "./modules/Module";
import {Event} from "./events/Event";

export enum AttackReason {
    MainModule,
    AttackModule,
    AttackAnyEventCard,
    AttackLaterEventCard,
    UsingAttackModuleSecondTime
}

export enum MoveDamageReason {
    MainModule,
    EventCard
}

export type Message = {
    text: string;
}


interface DeepReadonlyArray<T> extends ReadonlyArray<DeepReadonly<T>> {
}

type DeepReadonlyObject<T> = {
    readonly [P in keyof T]: DeepReadonly<T[P]>;
};

export type DeepReadonly<T> =
    T extends (infer R)[] ? DeepReadonlyArray<R> :
        T extends Function ? T :
            T extends object ? DeepReadonlyObject<T> :
                T;

export type SocketInitPayload = {
    gameId: string,
    token: string
}

export type CardTypeFromName<T extends ("module" | "event")> = T extends "module" ? Module : Event;