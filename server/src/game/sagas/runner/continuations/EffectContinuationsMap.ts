import {Effect} from "../Effects";
import {SelectContinuation} from "./SelectContinuation";
import {PutContinuation} from "./PutContinuation";
import {TakeContinuation} from "./TakeContinuation";
import {Continuation} from "@src/game/sagas/runner/Continuation";

type EffectContinuationConstructor = new (...args: any[]) => Continuation<any>;

export const effectContinuationsMap: Record<Effect["input"]["type"], EffectContinuationConstructor> = {
    select: SelectContinuation,
    put: PutContinuation,
    take: TakeContinuation,
}