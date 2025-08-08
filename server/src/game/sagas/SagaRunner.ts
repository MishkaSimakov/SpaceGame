import * as assert from "node:assert";

import ActionsBus from "../ActionsBus";

import {Effect, SagaGenerator} from "./Effects";
import GameState from "../GameState";
import {ActionsBusProxy} from "./ActionsBusProxy";
import {effectPerformers} from "./EffectsPerformers";

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
                call_args = result.value;
                this.stack.pop();
            } else {
                call_args = await this.performEffect(result.value as Effect);
            }
        }

        return call_args;
    }

    performEffect<T extends Effect>(effect: T) {
        return new Promise<any>(resolve => {
            const busProxy = new ActionsBusProxy(this.busRef);

            const cb = (result: any) => {
                resolve(result);
            };

            effectPerformers[effect.type](effect, cb, {
                state: this.stateRef,
                bus: busProxy,
                pushTask: this.pushTask.bind(this)
            });

            busProxy.perform();
        });
    }

    cancel(taskName: string) {
        let currentTask: { name: string, generator: Generator };
        do {
            assert.ok(this.stack.length !== 0, "trying to cancel a non-existing task");
            currentTask = this.stack.pop();

            currentTask.generator.return({});
        } while (currentTask.name !== taskName);
    }

    private pushTask(task: () => SagaGenerator) {
        this.stack.push({
            name: task.name,
            generator: task()
        });
    }
}