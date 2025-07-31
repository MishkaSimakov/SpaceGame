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
    id: number;
    playerId?: number;
    text: string;
    time: number;
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