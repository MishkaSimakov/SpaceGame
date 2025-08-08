import Player, {PlayerId} from "@common/Player";
import {time as timeAction, timeResult, timeResult as timeResultAction} from "@common/actions/Time";
import {
    addTimeRecord as addTimeRecordAction,
    changePlayerTime as changePlayerTimeAction
} from "@common/actions/Reducer";

import GameState, {TimeRecord, TimeRecordType} from "../../GameState";
import {all, put, select, take} from "../Effects";
import * as assert from "node:assert";

function* getTime() {
    const {res} = yield* all({
        req: put(timeAction()),
        res: take(timeResultAction)
    });

    return res.payload as number;
}

function getLastRecordByType(records: TimeRecord[], type: TimeRecordType) {
    for (let i = records.length - 1; i >= 0; i--) {
        if (records[i].type === type) {
            return records[i];
        }
    }
}

function getLastRecordByTypes(records: TimeRecord[], types: TimeRecordType[]) {
    for (let i = records.length - 1; i >= 0; i--) {
        if (types.includes(records[i].type)) {
            return records[i];
        }
    }
}

export function getTimeDecreasingPlayerId(state: GameState): PlayerId | undefined {
    if (state.timeRecords.length === 0) {
        return undefined;
    }

    const lastRecord = state.timeRecords[state.timeRecords.length - 1];

    if (lastRecord.type === TimeRecordType.FIGHT_TURN_ENDED) {
        return getLastRecordByType(state.timeRecords, TimeRecordType.DEFAULT_TURN_STARTED)?.playerId;
    } else {
        return lastRecord.playerId;
    }
}

export function* addTimeRecord(playerId: PlayerId, type: TimeRecordType) {
    const state = yield* select();

    if (!state.settings.withTimeControl) {
        return;
    }

    const currentTime = yield* getTime();

    yield* put(addTimeRecordAction(playerId, type, currentTime));

    if (type === TimeRecordType.DEFAULT_TURN_INTERRUPTED) {
        const prevRecord = getLastRecordByTypes(state.timeRecords, [
            TimeRecordType.DEFAULT_TURN_CONTINUED,
            TimeRecordType.DEFAULT_TURN_STARTED
        ]);
        assert.ok(prevRecord);

        yield* put(changePlayerTimeAction(playerId, prevRecord.time - currentTime));
    } else if (type === TimeRecordType.FIGHT_TURN_ENDED) {
        const prevRecord = getLastRecordByType(state.timeRecords, TimeRecordType.FIGHT_TURN_STARTED);
        assert.ok(prevRecord);

        yield* put(changePlayerTimeAction(playerId, state.settings.timeControlSettings.fightTimeIncrease));
        yield* put(changePlayerTimeAction(playerId, prevRecord.time - currentTime));
    } else if (type === TimeRecordType.DEFAULT_TURN_ENDED) {
        const prevRecord = getLastRecordByTypes(state.timeRecords, [
            TimeRecordType.DEFAULT_TURN_CONTINUED,
            TimeRecordType.DEFAULT_TURN_STARTED
        ]);
        assert.ok(prevRecord);

        yield* put(changePlayerTimeAction(playerId, state.settings.timeControlSettings.fightTimeIncrease));
        yield* put(changePlayerTimeAction(playerId, prevRecord.time - currentTime));
    }
}