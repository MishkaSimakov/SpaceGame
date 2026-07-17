import {expect, test} from "vitest";

import {rebuildSpaceshipResponse} from "@common/Actions";
import {StateGetters} from "@common/getters/State";

import {mockGame} from "./MockGame";
import {SpaceshipGetters} from "@common/getters/Spaceship";

test('finishWhenTimeIsOver', async () => {
    const {game, clock, sockets} = mockGame(2, {
        timeControlSettings: {
            startTime: 5,
            defaultTimeIncrease: 0,
            fightTimeIncrease: 0,
            loseWhenTimeout: true,
        }
    });

    sockets.addEmitListener((playerId, settings, event) => {
        if (event === 'rebuildSpaceshipRequest') {
            clock.advanceTime(6000);

            const player = StateGetters.playerById(game.state, playerId)!;
            game.sagaInput.put(
                rebuildSpaceshipResponse(SpaceshipGetters.mapForRebuildSpaceshipResponse(player.spaceship))
            );
        }
    });

    const result = await game.activate();

    expect(result.type).toEqual("finished");
});

test('finishWhenDeactivated', async () => {
    const {game} = mockGame(2);

    setImmediate(() => {
        game.deactivate();
    });

    const result = await game.activate();
    expect(result.type).toEqual("deactivated");
});

// test('endPlayerTurnWhenTimeIsOver', async () => {
//     const {game, clock} = mockGame(3, {
//         timeControlSettings: {
//             startTime: 5,
//             defaultTimeIncrease: 0,
//             fightTimeIncrease: 0,
//             loseWhenTimeout: true,
//         }
//     });
//
//     let sequence: string[] = [];
//
//     function* clientSaga() {
//         // first player lose
//         const action = yield* take('rebuildSpaceshipRequest');
//
//         clock.advanceTime(6000);
//
//         const player = StateGetters.playerById(game.state, action.payload.player)!;
//         yield* put(rebuildSpaceshipResponse(SpaceshipGetters.mapForRebuildSpaceshipResponse(player.spaceship)));
//
//         // second player turn should start
//         yield* take('rebuildSpaceshipRequest');
//     }
//
//     const result = await game.activate();
//     expect(result.type).toEqual("deactivated");
// });