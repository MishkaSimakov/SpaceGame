import {EventCard} from "../events/EventCard";
import SmallQuantumProtector from "./SmallQuantumProtector";
import QuantumProtector from "./QuantumProtector";
import {MainModule} from "./MainModule";
import SpaceSolver from "./SpaceSolver";
import IonDestroyer from "./IonDestroyer";
import QuantumDestabilizer from "./QuantumDestabilizer";

import {ModuleCard, ModuleType} from "../Types";


export function isModule(card: ModuleCard | EventCard): card is ModuleCard {
    return (card as ModuleCard).name !== undefined;
}

export function isProtector(card: ModuleCard | EventCard): card is (SmallQuantumProtector | QuantumProtector) {
    return isModule(card) && (card.type === ModuleType.SmallQuantumProtector || card.type === ModuleType.QuantumProtector);
}

export function isMainModule(card: ModuleCard | EventCard): card is MainModule {
    return isModule(card) && card.type === ModuleType.MainModule;
}

export function isWeapon(card: ModuleCard | EventCard): card is (SpaceSolver | IonDestroyer | QuantumDestabilizer) {
    return isModule(card) && (
        card.type === ModuleType.SpaceSolver
        || card.type === ModuleType.IonDestroyer
        || card.type === ModuleType.QuantumDestabilizer
    );
}