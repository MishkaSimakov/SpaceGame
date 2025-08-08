import * as assert from "node:assert";

import {Action} from "@common/actions/Action";
import ActionsBus from "@common/actions/ActionsBus";

import {Effect, SagaGenerator, SelectEffect, TakeEffect} from "./Effects";
import GameState from "./GameState";

interface EffectProcessingResult {
    payload: Promise<any>;
    emitted_actions: Action[];
    new_listeners: any[],
}

export class SagaRunner {
    private readonly stateRef: GameState;
    private readonly busRef: ActionsBus;

    private stack: {
        generator: SagaGenerator,
        name: string
    }[] = [];

    constructor(stateRef: GameState, busRef: ActionsBus, saga: (...args: any[]) => SagaGenerator, ...args: any[]) {
        this.stateRef = stateRef;
        this.busRef = busRef;

        this.stack.push({
            generator: saga(...args),
            name: saga.name
        });
    }

    async run() {
        let call_args: any = {}

        while (this.stack.length !== 0) {
            const result = this.stack[this.stack.length - 1].generator.next(call_args);

            if (result.done) {
                return result.value;
            }

            const effect = this.process_effect(result.value as Effect);

            for (const listener of effect.new_listeners) {
                this.busRef.once(listener.name, listener.listener);
            }

            for (const action of effect.emitted_actions) {
                this.busRef.emit(action);
            }

            call_args = await effect.payload;
        }
    }

    process_effect(effect: Effect) {
        switch (effect.type) {
            case "select": {
                return {
                    payload: Promise.resolve(structuredClone(this.stateRef)),
                    emitted_actions: [],
                    new_listeners: [],
                }
            }
            case "take": {
                let resolve, reject;
                const promise = new Promise<object>((res, rej) => {
                    resolve = res;
                    reject = rej;
                });

                return {
                    payload: promise,
                    emitted_actions: [],
                    new_listeners: [
                        {
                            name: effect.name,
                            listener: resolve
                        }
                    ]
                };
            }
            case "put": {
                return {
                    payload: Promise.resolve({}),
                    emitted_actions: [effect.action],
                    new_listeners: []
                }
            }
            case "all": {
                const result = {
                    promises: {} as Record<string, Promise<any>>,
                    emitted_actions: [] as Action[],
                    new_listeners: [] as any[]
                };

                for (const key in effect.effects) {
                    const child_effect = effect.effects[key].next().value as Effect;

                    // payload slot passed as reference
                    const child_result = this.process_effect(child_effect);

                    result.promises[key] = child_result.payload;
                    result.emitted_actions.push(...child_result.emitted_actions);
                    result.new_listeners.push(...child_result.new_listeners);
                }

                return {
                    payload: Promise.all(
                        Object.entries(result.promises)
                            .map(async ([k, v]) => [k, await v])
                    ).then(Object.fromEntries),
                    emitted_actions: result.emitted_actions,
                    new_listeners: result.new_listeners
                };
            }
        }
    }

    cancel(taskName: string) {
        let currentTask: { name: string, generator: Generator };
        do {
            assert.ok(this.stack.length !== 0, "trying to cancel a non-existing task");
            currentTask = this.stack.pop();

            currentTask.generator.return({});
        } while (currentTask.name !== taskName);
    }
}