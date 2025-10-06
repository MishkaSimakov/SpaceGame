// signals are sent through input channel into the game saga
// to indicate that some special event has happened

export const playerTimeoutSignal = Symbol('playerTimeoutSignal');
export type PlayerLostSignal = typeof playerTimeoutSignal;

export const deactivateSignal = Symbol('deactivateSignal');
export type DeactivateSignal = typeof deactivateSignal;
