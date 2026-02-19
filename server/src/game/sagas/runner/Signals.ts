// signals are sent through input channel into the game saga
// to indicate that some special event has happened

export const playerTimeoutSignal = Symbol('playerTimeoutSignal');
export type PlayerTimeoutSignal = typeof playerTimeoutSignal;

export const playerLostSignal = Symbol('playerLostSignal');
export type PlayerLostSignal = typeof playerLostSignal;

export const deactivateSignal = Symbol('deactivateSignal');
export type DeactivateSignal = typeof deactivateSignal;
