import TopBarDrawer from "./TopBarDrawer";
import {Group} from "../engine/Group";

export abstract class TopBarAdaptor {
    abstract drawPlayers(drawer: TopBarDrawer): Group;

    abstract drawStatus(drawer: TopBarDrawer): Group;

    // abstract drawCurrentPlayerData(drawer: TopBarDrawer, sceneWidth: number): void;

}