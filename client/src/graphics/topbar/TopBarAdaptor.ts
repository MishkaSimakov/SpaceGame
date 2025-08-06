import TopBarDrawer from "./TopBarDrawer";

export abstract class TopBarAdaptor {
    abstract drawStatus(drawer: TopBarDrawer, sceneWidth: number): void;

    abstract drawCurrentPlayerData(drawer: TopBarDrawer, sceneWidth: number): void;

    abstract drawPlayersData(drawer: TopBarDrawer, sceneWidth: number): void;
}