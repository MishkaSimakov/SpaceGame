// PlayerGameLogListener.ts
import Actions from "@common/actions/Main";
import {Message} from "@common/Types";
import ActionsBus from "./ActionsBus";
import {Action} from "@common/actions/Action";
import {User} from "../entity/user";
import {PlayerId} from "@common/Player";

type Components = {
    lastRequestUser?: string,
    nameById: (id: PlayerId) => string
};

type ListenersContainer = {
    [Key in keyof typeof Actions]?:
    typeof Actions[Key] extends (...args: any[]) => { type: string, payload: infer P }
        ? (payload: P, components: Components) => string | Message | undefined
        : never
};

function pluralize(n: number, one: string, few: string, many: string) {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return `${n} ${one}`;
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return `${n} ${few}`;
    return `${n} ${many}`;
}

function posToStr(pos: any) {
    if (!pos) return "";
    if (typeof pos.x !== "undefined" && typeof pos.y !== "undefined") {
        return `(${pos.x},${pos.y})`;
    }
    try {
        return JSON.stringify(pos);
    } catch {
        return String(pos);
    }
}

const listeners: ListenersContainer = {
    throwDiceResult: (result, {lastRequestUser}) =>
        `${lastRequestUser}: бросил кубик, выпало ${result}`,

    beginFight: (payload, {nameById}) =>
        `${nameById(payload.attacker)}: напал на ${nameById(payload.victim)}`,

    popCardFromHeap: (payload, {lastRequestUser}) =>
        `${lastRequestUser}: тянет карточку ${payload.type === 'event' ? 'действия' : 'модуля'}`,

    pushCardsToHand: (payload, {nameById}) =>
        `${nameById(payload.player)}: получил ${pluralize(payload.cards.length, 'карту', 'карты', 'карт')}`,

    pushCardsToDiscard: (payload) =>
        `В сброс положено ${pluralize(payload.cards.length, 'карта', 'карты', 'карт')} (${payload.type})`,

    pushCardsToStack: (payload) =>
        `В колоду добавлено ${pluralize(payload.cards.length, 'карта', 'карты', 'карт')} (${payload.type})`,

    returnDiscardsToStack: (payload) =>
        `В колоду возвращено ${pluralize(payload.discards.length, 'карта', 'карты', 'карт')} (${payload.type})`,

    popCardFromPlayerHand: (payload, {nameById}) =>
        `${nameById(payload.player)}: сыграл/взял карту из руки`,

    disposeCardsFromPlayerHand: (payload, {nameById}) =>
        `${nameById(payload.player)}: сбросил ${pluralize(payload.indices.length, 'карту', 'карты', 'карт')}`,

    // energy / turn / game state
    changePlayerEnergy: (payload, {nameById}) =>
        `${nameById(payload.player)}: энергия ${payload.delta >= 0 ? 'увеличена' : 'уменьшена'} на ${payload.delta}`,

    setCurrentPlayer: ({player}, {nameById}) =>
        `${nameById(player)}: начал ходить`,

    shiftFightTurnToNextPlayer: () =>
        `Ход в бою передан следующему участнику`,

    endFight: () =>
        `Бой завершён`,

    playerSkipNextTurn: (payload, {nameById}) =>
        `${nameById(payload.player)}: пропустит следующий ход`,

    playerLost: (payload, {nameById}) =>
        `${nameById(payload.player)}: выбывает из игры`,

    playerRebuiltSpaceship: (payload, {nameById}) =>
        `${nameById(payload.player)}: перестроил корабль`,

    // modules / damage / repair
    destructSpaceshipModules: (payload, {nameById}) =>
        `${nameById(payload.player)}: потерял ${pluralize(payload.positions.length, 'модуль', 'модуля', 'модулей')}`,

    removeSpaceshipModules: (payload, {nameById}) =>
        `${nameById(payload.player)}: удалил ${pluralize(payload.positions.length, 'модуль', 'модуля', 'модулей')}`,

    changeModuleHealth: (payload, {nameById}) => {
        const who = nameById(payload.player);
        const pos = posToStr(payload.position);
        const delta = payload.delta;
        if (delta < 0) {
            return `${who}: модуль в позиции ${pos} получил ${-delta} урона`;
        } else {
            return `${who}: модуль в позиции ${pos} восстановлен на ${delta}`;
        }
    },

    activateProtector: (payload, {nameById}) =>
        `${nameById(payload.player)}: активировал протектор на позиции ${posToStr(payload.position)}`,

    // event-card related requests/responses (safe, no card contents)
    permuteTopThreeEventCardsResponse: (_payload, {lastRequestUser}) =>
        `${lastRequestUser}: переставил порядок верхних карт событий`,

    tryToRunawayResponse: (willRunaway, {lastRequestUser}) =>
        willRunaway ? `${lastRequestUser}: пытается сбежать, кидая кубик` : undefined,

    chooseModuleToRepairByDiceRequest: ({player}, {nameById}) =>
        `${nameById(player)}: пытается починить модуль, кидая кубик`,

    chooseModuleToRepairByDiceResponse: (position, {lastRequestUser}) =>
        position ? `${lastRequestUser}: починил модуль` : `${lastRequestUser}: не удалось починить модуль`,

    chooseCardsForRepairSpaceshipResponse: (indexes, {lastRequestUser}) =>
        `${lastRequestUser}: выбрал ${pluralize(indexes.length, 'карту', 'карты', 'карт')} для ремонта корабля`,

    chooseCardsToDiscardAndTakeAnotherResponse: (indexes, {lastRequestUser}) =>
        `${lastRequestUser}: сбросил ${pluralize(indexes.length, 'карту', 'карты', 'карт')} и берёт другую`,

    useEventCardToDealDamageResponse: (use, {lastRequestUser}) =>
        `${lastRequestUser}: ${use ? 'использовал' : 'не использовал'} карту события для урона`,

    choosePlayerToStealCardResponse: (victim, {lastRequestUser, nameById}) =>
        `${lastRequestUser}: выбрал цель кражи — ${nameById(victim)}`,

    chooseCardToStealResponse: (_payload, {lastRequestUser}) =>
        `${lastRequestUser}: украл карту`,

    chooseCardTypeResponse: ({chosenType}, {lastRequestUser}) =>
        `${lastRequestUser}: выбрал тип карты — ${chosenType === "module" ? "строительства" : "действия"}`,
};

export class PlayerGameLogListener {
    messages: Message[] = [];

    private lastRequest?: Action<string, any, any>;

    constructor(private busRef: ActionsBus, private users: User[]) {
    }

    registerListeners() {
        this.busRef.on('*', action => {
            this.handleAction(action);
        });
    }

    private handleAction(action: Action<string, any, any>) {
        if (action.type.endsWith('Request') || action.type === 'throwDice') {
            this.lastRequest = action;
        }

        if (action.type in listeners) {
            const messageGenerator = this.getMessageGenerator(action.type)
            const result = messageGenerator(action.payload, this.getComponents());

            if (!result) {
                return;
            }

            if (typeof result === "string") {
                this.messages.push({
                    text: result
                });
            } else {
                this.messages.push(result);
            }
        }
    }

    private getMessageGenerator(actionType: string) {
        return listeners[actionType as keyof typeof listeners] as
            (payload: any, components: Components) => string | Message | undefined;
    }

    private getComponents(): Components {
        const nameById = (id: PlayerId) => {
            return this.users.find(u => u.id === id)!.login;
        }

        return {
            lastRequestUser: this.lastRequest ? nameById(this.lastRequest.payload.player) : undefined,
            nameById
        };
    }
}
