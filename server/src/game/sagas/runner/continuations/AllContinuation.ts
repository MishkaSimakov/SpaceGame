import {CancellableContinuation, Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {AllEffect, Effect} from "../Effects";
import {effectContinuationsMap} from "./EffectContinuationsMap";
import {ok, Result} from "../../../../helpers/Result";

export class AllContinuation implements CancellableContinuation<AllEffect<any>["input"]> {
    private errorOccurred = false;
    private cancelled = false;

    constructor(
        private readonly env: Environment,
        private readonly consumer: Continuation<any>
    ) {
    }

    continue(effect: AllEffect<any>["input"]): void {
        this.env.bus.lock(() => {
            this.setupEffects(effect.effects);
        })
    }

    private setupEffects(effects: any) {
        const result: Record<string, any> = {};

        for (const key of Object.keys(effects)) {
            if (this.errorOccurred) {
                break;
            }

            const child = effects[key].next().value as Effect["input"];

            const cont = new effectContinuationsMap[child.type](this.env, {
                continue: (childResult: Result<any, any>) => {
                    // variable `key` changes on each iteration
                    const keyCopy = key;

                    if (childResult._tag === "ok") {
                        result[keyCopy] = childResult.value;

                        if (Object.keys(result).length === Object.keys(effects).length && !this.cancelled) {
                            this.consumer.continue(ok(result));
                        }
                    } else {
                        // cancel all remaining effects
                        this.errorOccurred = true;

                        // propagate error
                        // TODO: error escapes!
                        if (!this.cancelled) {
                            this.consumer.continue(childResult);
                        } else {
                            console.warn("💀 error escaped in PutContinuation:", childResult);
                        }
                    }
                }
            });

            cont.continue(child);
        }
    }

    cancel() {
        this.cancelled = true;
    }
}