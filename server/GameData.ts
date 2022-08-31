import Module from "../common/modules/Module";
import SpaceSolver from "../common/modules/SpaceSolver";
import SolarPanel from "../common/modules/SolarPanel";
import AttackModule from "../common/modules/AttackModule";
import Event from "../common/events/Event";
import MainModule from "../common/modules/MainModule";
import SmallQuantumProtector from "../common/modules/SmallQuantumProtector";

export default class GameData {
    protected modulesStack: Module[] = [
        new SpaceSolver(1, 0, 1, 0),
        new SpaceSolver(2, 0, 2, 0),
        new SpaceSolver(0, 1, 0, 1),
        new SpaceSolver(0, 2, 0, 2),

        new SmallQuantumProtector(1, 1, 1, 1),

        new SolarPanel(1, 2, 1, 2),
        new SolarPanel(2, 1, 2, 1),
        new SolarPanel(0, 1, 0, 1),
        new SolarPanel(0, 2, 0, 2),
        new SolarPanel(1, 0, 1, 0),
        new SolarPanel(2, 0, 2, 0),

        new AttackModule(1, 1, 1, 1),
    ];

    protected eventsStack: Event[] = [];

    protected mainModules: MainModule[] = [
        new MainModule(),
        new MainModule(),
        new MainModule(),
        new MainModule(),
        new MainModule()
    ];

    readonly startCardsCount: number = 4;


    popMainModule(): MainModule {
        return this.mainModules.pop();
    }

    popModuleCards(count: number): Module[] {
        let cards = this.modulesStack.slice(-count);

        this.modulesStack = this.modulesStack.slice(0, -count);

        return cards;
    }

    popEventCard(): Event {
        return this.eventsStack.pop();
    }
}