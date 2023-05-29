import Player from "../../../common/Player";

enum TimeRecordType {
    DEFAULT_TURN_STARTED,
    DEFAULT_TURN_ENDED,
    FIGHT_TURN_STARTED,
    FIGHT_TURN_ENDED
}

type TimeRecord = {
    type: TimeRecordType,
    playerLink: number,
    time: number
};

type TimeControlSettings = {
    START_TIME: number;
    DEFAULT_TIME_INCREASE: number;
    FIGHT_TIME_INCREASE: number;
};

class TimeManager {
    timeRecords: TimeRecord[] = [];
    playersTime: Record<number, number> = {};

    timeControlSettings: TimeControlSettings;

    constructor(timeControlSettings: TimeControlSettings, players: Player[]) {
        this.timeControlSettings = timeControlSettings;

        for (let player of players) {
            this.playersTime[player.link] = this.timeControlSettings.START_TIME;
        }
    }

    addRecord(type: TimeRecordType, player: Player) {
        let currentTime = (new Date()).getTime();

        console.log(`Add record: ${type} for player: ${player.link}`);

        if (type === TimeRecordType.FIGHT_TURN_ENDED) {
            let prevRecord = this.getLastRecordByLinkAndType(player.link, TimeRecordType.FIGHT_TURN_STARTED);

            this.playersTime[player.link] += this.timeControlSettings.FIGHT_TIME_INCREASE;
            this.playersTime[player.link] -= currentTime - prevRecord.time;
        }
        if (type === TimeRecordType.DEFAULT_TURN_ENDED) {
            let prevRecord = this.getLastRecordByLinkAndType(player.link, TimeRecordType.DEFAULT_TURN_STARTED);

            this.playersTime[player.link] += this.timeControlSettings.DEFAULT_TIME_INCREASE;
            this.playersTime[player.link] -= currentTime - prevRecord.time;
        }

        this.timeRecords.push({
            type: type,
            playerLink: player.link,
            time: currentTime
        });
    }

    getLastRecord(): TimeRecord {
        if (this.timeRecords.length === 0)
            return;

        return this.timeRecords[this.timeRecords.length - 1];
    }

    getLastRecordByLinkAndType(link: number, type: TimeRecordType): TimeRecord {
        for (let i = this.timeRecords.length - 1; i >= 0; i--) {
            if (this.timeRecords[i].playerLink === link && this.timeRecords[i].type === type) {
                return this.timeRecords[i];
            }
        }
    }

    getTimeDecreasingPlayerLink(): number {
        return this.getLastRecord().playerLink;
    }

    getPlayersTime(): Record<number, number> {
        let playersTime = {...this.playersTime};

        let lastRecord = this.getLastRecord();
        let currentTime = (new Date()).getTime();

        if (lastRecord.type === TimeRecordType.DEFAULT_TURN_STARTED) {
            playersTime[lastRecord.playerLink] -= (currentTime - lastRecord.time);
        }
        if (lastRecord.type === TimeRecordType.FIGHT_TURN_STARTED) {
            playersTime[lastRecord.playerLink] -= (currentTime - lastRecord.time);

            let lastDefaultTurnStart : TimeRecord;
            let fightStart: TimeRecord;

            for (let i = this.timeRecords.length - 1; i >= 0; i--) {
                if (this.timeRecords[i].playerLink === lastRecord.playerLink && this.timeRecords[i].type === TimeRecordType.DEFAULT_TURN_STARTED) {
                    lastDefaultTurnStart = this.timeRecords[i];
                    fightStart = this.timeRecords[i + 1];
                    break;
                }
            }

            playersTime[lastRecord.playerLink] -= (fightStart.time - lastDefaultTurnStart.time);
        }

        return playersTime;
    }
}

export {TimeRecord, TimeManager, TimeRecordType, TimeControlSettings};