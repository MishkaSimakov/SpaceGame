import {Effect} from "../Effects";
import {CancellableContinuation, Continuation} from "../Continuation";
import {SelectContinuation} from "./SelectContinuation";
import {PutContinuation} from "./PutContinuation";
import {TakeContinuation} from "./TakeContinuation";
import {AllContinuation} from "./AllContinuation";

type EffectContinuationConstructor = new (...args: any[]) => CancellableContinuation<any>;

export const effectContinuationsMap: Record<Effect["input"]["type"], EffectContinuationConstructor> = {
    select: SelectContinuation,
    put: PutContinuation,
    take: TakeContinuation,
    all: AllContinuation,
}