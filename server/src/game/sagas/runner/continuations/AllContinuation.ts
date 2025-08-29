import {Continuation} from "../Continuation";
import {Environment} from "../Environment";
import {AllEffect, Effect} from "../Effects";
import {effectContinuationsMap} from "./EffectContinuationsMap";
import {ok, Result} from "../../../../helpers/Result";

export class AllContinuation implements Continuation<AllEffect<any>["input"]> {
    private errorOccurred = false;

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
        const result = {};

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

                        if (Object.keys(result).length === Object.keys(effects).length) {
                            this.consumer.continue(ok(result));
                        }
                    } else {
                        // cancel all remaining effects
                        this.errorOccurred = true;

                        // propagate error
                        this.consumer.continue(childResult);
                    }
                },
                cancel: () => {
                }
            });

            cont.continue(child);
        }
    }
}