import {TimeControlSettings} from "../../../common/GameForPlayerDTO";
import Player from "../../../common/Player";

enum TimeRecordType {
    DEFAULT_TURN_STARTED,
    DEFAULT_TURN_ENDED,
    FIGHT_TURN_STARTED,
    FIGHT_TURN_ENDED
}

type TimeRecord = {
    type: TimeRecordType,
    playerId: number,
    time: number
};

class TimeManager {
    timeRecords: TimeRecord[] = [];
    playersTime: Record<number, number> = {};

    timeControlSettings: TimeControlSettings;

    constructor(timeControlSettings: TimeControlSettings, players: Player[]) {
        this.timeControlSettings = timeControlSettings;

        for (let player of players) {
            this.playersTime[player.id] = this.timeControlSettings.START_TIME;
        }
    }

    addRecord(type: TimeRecordType, player: Player) {
        let currentTime = (new Date()).getTime();

        if (type === TimeRecordType.FIGHT_TURN_ENDED) {
            let prevRecord = this.getLastRecordByPlayerIdAndType(player.id, TimeRecordType.FIGHT_TURN_STARTED);

            this.playersTime[player.id] += this.timeControlSettings.FIGHT_TIME_INCREASE;
            this.playersTime[player.id] -= currentTime - prevRecord.time;
        }
        if (type === TimeRecordType.DEFAULT_TURN_ENDED) {
            let lastDefaultTurnStart: TimeRecord;
            let fightStart: TimeRecord;

            for (let i = this.timeRecords.length - 1; i >= 0; i--) {
                if (this.timeRecords[i].playerId === player.id && this.timeRecords[i].type === TimeRecordType.DEFAULT_TURN_STARTED) {
                    lastDefaultTurnStart = this.timeRecords[i];
                    fightStart = this.timeRecords[i + 1];
                    break;
                }
            }

            this.playersTime[player.id] += this.timeControlSettings.DEFAULT_TIME_INCREASE;

            if (fightStart?.type === TimeRecordType.FIGHT_TURN_STARTED) {
                // if fight started after turn start
                let fightEnd = this.getLastRecordByType(TimeRecordType.FIGHT_TURN_ENDED);

                // before fight
                this.playersTime[player.id] -= fightStart.time - lastDefaultTurnStart.time;

                // after fight
                this.playersTime[player.id] -= currentTime - fightEnd.time;
            } else {
                // simple boring move without fights
                this.playersTime[player.id] -= currentTime - lastDefaultTurnStart.time;
            }
        }

        this.timeRecords.push({
            type: type,
            playerId: player.id,
            time: currentTime
        });
    }

    getLastRecord(): TimeRecord {
        if (this.timeRecords.length === 0)
            return;

        return this.timeRecords[this.timeRecords.length - 1];
    }

    getLastRecordByPlayerIdAndType(playerId: number, type: TimeRecordType): TimeRecord {
        for (let i = this.timeRecords.length - 1; i >= 0; i--) {
            if (this.timeRecords[i].playerId === playerId && this.timeRecords[i].type === type) {
                return this.timeRecords[i];
            }
        }
    }

    getLastRecordByType(type: TimeRecordType) {
        for (let i = this.timeRecords.length - 1; i >= 0; i--) {
            if (this.timeRecords[i].type === type) {
                return this.timeRecords[i];
            }
        }
    }

    getTimeDecreasingPlayerId(): number {
        const lastRecord = this.getLastRecord();

        if (lastRecord.type === TimeRecordType.FIGHT_TURN_ENDED) {
            return this.getLastRecordByType(TimeRecordType.DEFAULT_TURN_STARTED).playerId;
        } else {
            return lastRecord.playerId;
        }
    }

    getPlayersTime(): Record<number, number> {
        let playersTime = {...this.playersTime};

        let lastRecord = this.getLastRecord();
        let currentTime = (new Date()).getTime();

        if (lastRecord.type === TimeRecordType.DEFAULT_TURN_STARTED) {
            playersTime[lastRecord.playerId] -= (currentTime - lastRecord.time);
        } else if (lastRecord.type === TimeRecordType.FIGHT_TURN_STARTED) {
            playersTime[lastRecord.playerId] -= (currentTime - lastRecord.time);

            let lastDefaultTurnStart: TimeRecord;
            let fightStart: TimeRecord;

            for (let i = this.timeRecords.length - 1; i >= 0; i--) {
                if (this.timeRecords[i].playerId === lastRecord.playerId && this.timeRecords[i].type === TimeRecordType.DEFAULT_TURN_STARTED) {
                    lastDefaultTurnStart = this.timeRecords[i];
                    fightStart = this.timeRecords[i + 1];
                    break;
                }
            }

            playersTime[lastRecord.playerId] -= (fightStart.time - lastDefaultTurnStart.time);
        } else if (lastRecord.type === TimeRecordType.FIGHT_TURN_ENDED) {
            // fight in move ended but
        }

        return playersTime;
    }
}

export {TimeRecord, TimeManager, TimeRecordType, TimeControlSettings};
