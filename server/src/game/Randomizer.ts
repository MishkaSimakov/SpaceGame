import Rand from "rand-seed";

export class Randomizer {
    rand: Rand;

    constructor(seed: string) {
        this.rand = new Rand(seed);
    }

    dice() {
        return Math.floor(this.rand.next() * 6) + 1;
    }

    shuffle<T>(array: T[]) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(this.rand.next() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }
}