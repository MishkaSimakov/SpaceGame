import {test} from "uvu";
import * as assert from "uvu/assert"

import {rebuildSpaceshipResponse} from "@common/Actions";
import {StateGetters} from "@common/getters/State";

import {mockGame} from "./MockGame";
import {put, take} from "@src/game/sagas/runner/Effects";
import {SpaceshipGetters} from "@common/getters/Spaceship";

test('finishWhenTimeIsOver', async () => {
    const {game, clock} = mockGame(2, {
        timeControlSettings: {
            startTime: 5,
            defaultTimeIncrease: 0,
            fightTimeIncrease: 0,
            loseWhenTimeout: true,
        }
    });

    game.bus.on('rebuildSpaceshipRequest', (action) => {
        const player = StateGetters.playerById(game.state, action.payload.player)!;
        const spaceship = player.spaceship.modules.map(module => ({
            id: module.id,
            position: {x: module.x, y: module.y},
            rotation: module.rotation
        }));

        clock.advanceTime(6000);

        game.bus.emit(rebuildSpaceshipResponse(spaceship));
    });

    const result = await game.activate();
    assert.equal(result.type, "finished");
});

test('finishWhenDeactivated', async () => {
    const {game} = mockGame(2);

    setImmediate(() => {
        game.deactivate();
    });

    const result = await game.activate();
    assert.equal(result.type, "deactivated");
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
//     assert.equal(result.type, "deactivated");
// });

test.run();