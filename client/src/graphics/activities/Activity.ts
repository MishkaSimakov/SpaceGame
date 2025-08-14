export abstract class Activity {
    abstract activate(): Promise<any>;

    abstract update(): void;
}