import {PlayerId} from "@common/Player";
import Actions from "@common/actions/Main"

import GameState, {TimeRecord, TimeRecordType} from "../../GameState";
import {all, put, select, take} from "../Effects";
import * as assert from "node:assert";
import {StateGetters} from "@common/getters/State";

const {
    time: timeAction,
    addTimeRecord: addTimeRecordAction,
    changePlayerTime: changePlayerTimeAction
} = Actions;

function* getTime() {
    const {res} = yield* all({
        req: put(timeAction()),
        res: take('timeResult')
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

export function getPlayerTime(state: GameState, playerId: PlayerId, currentTime: number) {
    const playerRecords = state.timeRecords.filter(r => r.playerId === playerId);

    if (playerRecords.length === 0) {
        return state.settings.timeControlSettings.startTime;
    }

    const lastRecord = playerRecords[playerRecords.length - 1];
    const recordedTime = StateGetters.playerById(state, playerId).time;

    if (lastRecord.type === TimeRecordType.DEFAULT_TURN_STARTED || lastRecord.type === TimeRecordType.DEFAULT_TURN_CONTINUED || lastRecord.type === TimeRecordType.FIGHT_TURN_STARTED) {
        return recordedTime - (currentTime - lastRecord.time);
    } else {
        return recordedTime;
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

        yield* put(changePlayerTimeAction(playerId, state.settings.timeControlSettings.defaultTimeIncrease));
        yield* put(changePlayerTimeAction(playerId, prevRecord.time - currentTime));
    }
}