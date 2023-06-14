import {Container} from "./Container";
import {Shape} from "./Shape";
import {_registerNode} from "./Global";
import {NodeConfig} from "./Node";

export class Group<Config extends NodeConfig = NodeConfig> extends Container<Shape | Group, Config> {
    constructor(config?: Config) {
        super(config);
    }
}

Group.prototype.nodeType = 'Group';
_registerNode(Group);
