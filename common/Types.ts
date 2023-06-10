enum AttackReason {
    MainModule,
    AttackModule,
    AttackAnyEventCard,
    AttackLaterEventCard,
    UsingAttackModuleSecondTime
}

enum MoveDamageReason {
    MainModule,
    EventCard
}

type Message = {
    id: number;
    playerId?: number;
    text: string;
    time: number;
}

export {AttackReason, MoveDamageReason, Message};
