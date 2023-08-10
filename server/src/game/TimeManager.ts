import { TimeControlSettings } from "../../../common/GameForPlayerDTO";
import Player from "../../../common/Player";

enum TimeRecordType {
    DEFAULT_TURN_STARTED,
    DEFAULT_TURN_ENDED, // update time, +45 s

    // before fight start
    DEFAULT_TURN_INTERRUPTED, // update time

    // after fight end
    DEFAULT_TURN_CONTINUED,

    FIGHT_TURN_STARTED,
    FIGHT_TURN_ENDED// update time, +10 s
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

        if (type === TimeRecordType.DEFAULT_TURN_INTERRUPTED) {
            // TURN_STARTED or TURN_CONTINUED
            let prevRecord = this.getLastRecordByTypes([
                TimeRecordType.DEFAULT_TURN_CONTINUED,
                TimeRecordType.DEFAULT_TURN_STARTED
            ]);

            this.playersTime[player.id] -= (currentTime - prevRecord.time);
        } else if (type === TimeRecordType.FIGHT_TURN_ENDED) {
            let prevRecord = this.getLastRecordByType(TimeRecordType.FIGHT_TURN_STARTED);

            this.playersTime[player.id] += this.timeControlSettings.FIGHT_TIME_INCREASE;
            this.playersTime[player.id] -= currentTime - prevRecord.time;
        } else if (type === TimeRecordType.DEFAULT_TURN_ENDED) {
            let prevRecord = this.getLastRecordByTypes([
                TimeRecordType.DEFAULT_TURN_CONTINUED,
                TimeRecordType.DEFAULT_TURN_STARTED
            ]);

            this.playersTime[player.id] += this.timeControlSettings.DEFAULT_TIME_INCREASE;
            this.playersTime[player.id] -= (currentTime - prevRecord.time);
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

    getLastRecordByType(type: TimeRecordType) {
        for (let i = this.timeRecords.length - 1; i >= 0; i--) {
            if (this.timeRecords[i].type === type) {
                return this.timeRecords[i];
            }
        }
    }

    getLastRecordByTypes(types: TimeRecordType[]) {
        for (let i = this.timeRecords.length - 1; i >= 0; i--) {
            if (types.includes(this.timeRecords[i].type)) {
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

        if (this.timeRecords.length === 0)
            return playersTime;

        let lastRecord = this.getLastRecord();
        let currentTime = (new Date()).getTime();

        playersTime[lastRecord.playerId] -= (currentTime - lastRecord.time)

        return playersTime;
    }
}

export {TimeRecord, TimeManager, TimeRecordType, TimeControlSettings};
