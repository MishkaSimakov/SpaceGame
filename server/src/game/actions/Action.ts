export interface Action {
    type: string;
    payload?: any;
}

export type ActionConstructor = (...args: any[]) => Action;
