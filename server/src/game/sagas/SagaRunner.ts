import * as assert from "node:assert";

import ActionsBus from "../ActionsBus";

import {Effect, SagaGenerator} from "./Effects";
import GameState from "../InitGameState";
import {ActionsBusProxy} from "./ActionsBusProxy";
import {effectPerformers} from "./EffectsPerformers";

export class SagaRunner<R> {
    private readonly stateRef: GameState;
    private readonly busRef: ActionsBus;

    private stack: {
        generator: SagaGenerator<any>,
        name: string
    }[] = [];

    private currentEffectCallback?: {
        (result: any): void,
        cancel: () => void
    } = undefined;

    constructor(stateRef: GameState, busRef: ActionsBus, saga: (...args: any[]) => SagaGenerator<R>, ...args: any[]) {
        this.stateRef = stateRef;
        this.busRef = busRef;

        this.stack.push({
            generator: saga(...args),
            name: saga.name
        });
    }

    async run(): Promise<R | "cancel"> {
        let call_args: any = {}

        while (this.stack.length !== 0) {
            const result = this.stack[this.stack.length - 1].generator.next(call_args);

            if (result.done) {
                call_args = result.value;
                this.stack.pop();
            } else {
                call_args = await this.performEffect(result.value);
            }
        }

        return call_args as R;
    }

    performEffect<T extends Effect["input"]>(effect: T) {
        return new Promise<any>(resolve => {
            const busProxy = new ActionsBusProxy(this.busRef);

            const cb = (result: any) => {
                resolve(result);
            };

            // TODO: check later
            // @ts-ignore
            effectPerformers[effect.type](effect, cb, {
                state: this.stateRef,
                busProxy: busProxy,
                pushTask: this.pushTask.bind(this)
            });

            this.currentEffectCallback = cb as {
                (result: any): void,
                cancel: () => void
            };

            busProxy.perform();
        });
    }

    cancel(taskName: string) {
        let currentTask: { name: string, generator: Generator };
        do {
            assert.ok(this.stack.length !== 0, "trying to cancel a non-existing task");
            currentTask = this.stack.pop()!;

            assert.ok(this.currentEffectCallback, "assumingly you are trying to call `cancel` from inside a saga. This is not implemented, don't do that, please.");
            currentTask.generator.return({});
            this.currentEffectCallback.cancel();
        } while (currentTask.name !== taskName);
    }

    currentTask(): string {
        return this.stack[this.stack.length - 1].name;
    }

    private pushTask(task: () => SagaGenerator<any>) {
        this.stack.push({
            name: task.name,
            generator: task()
        });
    }
}