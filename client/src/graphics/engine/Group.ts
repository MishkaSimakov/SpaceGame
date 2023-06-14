import {Container} from "./Container";
import {Shape} from "./Shape";
import {_registerNode} from "./Global";

export class Group extends Container<Shape | Group> {

}

Group.prototype.nodeType = 'Group';
_registerNode(Group);
