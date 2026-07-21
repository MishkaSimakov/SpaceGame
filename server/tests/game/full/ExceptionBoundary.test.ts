import {expect, test} from "vitest";

import {PlayerId} from "@common/Types";
import {GameResult} from "@src/game/Game";
import {GameClock} from "@src/game/GameClock";

import {MockClock} from "./MockClock";
import {mockGame} from "./MockGame";

/*
 * Control reaches a game from outside its saga through a fixed set of entry points: the promise
 * returned by `activate`, the receiver attached to the saga output, the socket listeners, the
 * player connection callbacks, the game clock deadlines and the deactivation observable.
 *
 * Above most of those there is nobody left to catch: a socket listener runs inside socket.io's
 * emitter, a deadline runs inside a timer, an observable notification runs inside whoever called
 * `set`. An exception that escapes one of them therefore ends as an unhandled rejection rather than
 * as a lost game, so each entry point must absorb its own failures and abort the saga instead —
 * aborting is what settles `activate` and lets the owner mark the game as broken.
 */

type Settled =
    | { status: "resolved", value: GameResult }
    | { status: "rejected", reason: unknown }
    | { status: "pending" };

/**
 * Races the activation against a timer. A game that absorbed a failure settles; a game that lost
 * the failure stays parked in a socket request that will never be answered, and reports "pending"
 * instead of hanging the test.
 */
function settleWithin(promise: Promise<GameResult>, milliseconds: number = 100): Promise<Settled> {
    return Promise.race([
        promise.then(
            (value): Settled => ({status: "resolved", value}),
            (reason: unknown): Settled => ({status: "rejected", reason})
        ),
        new Promise<Settled>(resolve => {
            setTimeout(() => resolve({status: "pending"}), milliseconds);
        })
    ]);
}

/**
 * A game driven up to the point where it waits for the first player's response. The mock sockets
 * never acknowledge, so the game stays there until something disturbs it.
 */
function runningGame() {
    const context = mockGame(2);

    return {...context, activation: settleWithin(context.game.activate())};
}

function throwOnEmit() {
    return () => {
        throw new Error("socket transport failed");
    };
}

test('storageFailureWhileRecordingSagaOutputAbortsGame', async () => {
    const {game, storage} = mockGame(2);

    storage.addAppendListener(() => {
        throw new Error("storage is unwritable");
    });

    const result = await settleWithin(game.activate());

    expect(result.status).toEqual("rejected");
});

test('cheatListenerFailureAbortsGame', async () => {
    const {sockets, activation} = runningGame();

    sockets.addEmitListener(throwOnEmit());

    expect(() => sockets.trigger('cheatChangeEnergy', 0, {target: 0, delta: 1})).not.toThrow();
    expect((await activation).status).toEqual("rejected");
});

test('cheatListenerFailureBeforeSagaStartsDoesNotEscape', () => {
    const {sockets} = mockGame(2);

    sockets.addEmitListener(throwOnEmit());

    // The cheat listeners are registered by the constructor, while the aborter they fall back on is
    // installed only once the saga starts, so a cheat arriving in between has nowhere to unwind to.
    expect(() => sockets.trigger('cheatChangeEnergy', 0, {})).not.toThrow();
});

test('pauseListenerFailureAbortsGame', async () => {
    const {sockets, activation} = runningGame();

    sockets.addEmitListener(throwOnEmit());

    expect(() => sockets.trigger('playerRequestsPause', 0, {})).not.toThrow();
    expect((await activation).status).toEqual("rejected");
});

test('resumeListenerFailureBeforeSagaStartsDoesNotEscape', () => {
    const {sockets} = mockGame(2);

    sockets.addEmitListener(throwOnEmit());

    // The game clock starts paused, so the resume listener does reach the clock before activation.
    expect(() => sockets.trigger('playerRequestsResume', 0, {})).not.toThrow();
});

test('playerConnectFailureDoesNotEscape', async () => {
    const {game, sockets, activation} = runningGame();

    sockets.addEmitListener(throwOnEmit());

    expect(() => game.onPlayerConnect(0, "socket-0")).not.toThrow();

    await activation;
});

test('playerDisconnectFailureDoesNotEscape', async () => {
    const {game, sockets, activation} = runningGame();

    sockets.addEmitListener(throwOnEmit());

    expect(() => game.onPlayerDisconnect(0)).not.toThrow();

    await activation;
});
