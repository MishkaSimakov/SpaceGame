import Module, {ModuleTypes} from "./modules/Module";
import {MainModule} from "./modules/MainModule";
import Vector2 from "./Vector2";

export default class Spaceship {
    directions: Record<string, [number, number]> = {
        'left': [-1, 0],
        'top': [0, 1],
        'right': [1, 0],
        'bottom': [0, -1]
    }

    opposites: Record<string, string> = {
        'left': 'right',
        'top': 'bottom',
        'right': 'left',
        'bottom': 'top'
    }

    modules: Module[] = []

    activatedProtector: Module | undefined;

    constructor(mainModule: Module) {
        mainModule.x = 0;
        mainModule.y = 0;
        this.modules.push(mainModule);
    }

    getMainModule(): MainModule {
        return this.getModulesByType(ModuleTypes.MainModule)[0] as MainModule;
    }

    getTotalCapacity(): number {
        return this.modules.reduce((ps, card) => ps + card.capacity, 0);
    }

    getTotalEnergyIncrease(): number {
        return this.modules.reduce((ps, card) => ps + card.energyIncrease, 0);
    }

    addModule(module: Module, x: number, y: number): boolean {
        if (!this.canConnectModule(module, x, y))
            return false;

        module.x = x;
        module.y = y;
        this.modules.push(module);

        return true;
    }

    canConnectModule(module: Module, x: number, y: number): boolean;
    canConnectModule(module: Module): boolean;
    canConnectModule(module: Module, x?: number, y?: number): boolean {
        if (this.modules.indexOf(module) !== -1 && x === undefined && y === undefined) {
            x = module.x;
            y = module.y;
        } else if (this.getModuleByPosition(x, y))
            return false;

        let hasConnection = false;

        for (let [key, value] of Object.entries(this.directions)) {
            let module_in_direction = this.getModuleByPosition(x + value[0], y + value[1]);

            if (!module_in_direction) continue;

            if (module.connectors[key] !== module_in_direction.connectors[this.opposites[key]]) {
                return false;
            }

            if (module.connectors[key] !== 0)
                hasConnection = true;
        }

        return hasConnection || module.isMain;
    }

    removeModule(x: number, y: number);
    removeModule(module: Module);
    removeModule(module: Module[]);
    removeModule(x: number | Module | Module[], y?: number) {
        if (typeof x === 'number') {
            this.modules = this.modules.filter(card => (card.x !== x || card.y !== y));

            return;
        } else if (Array.isArray(x)) {
            for (let m of x)
                this.removeModule(m);

            return;
        }

        this.removeModule(x.x, x.y);
    }

    getModuleByPosition(x: number, y: number);
    getModuleByPosition(position: Vector2);
    getModuleByPosition(x: (number|Vector2), y?: number): Module {
        if (typeof x == "number") {
            return this.modules.filter(card => card.x === x && card.y === y)[0];
        } else {
            return this.modules.filter(card => card.x === x.x && card.y === x.y)[0];
        }
    }

    getPossibleConnectionsFor(module: Module): number[][] {
        let possible_connections = []

        for (let i in this.modules) {
            let spaceship_module = this.modules[i];
            for (let direction in this.directions) {
                let module_in_direction = this.getModuleByPosition(spaceship_module.x + this.directions[direction][0], spaceship_module.y + this.directions[direction][1]);

                if (module_in_direction) continue;

                if (this.canConnectModule(module, spaceship_module.x + this.directions[direction][0], spaceship_module.y + this.directions[direction][1]))
                    possible_connections.push([
                        spaceship_module.x + this.directions[direction][0],
                        spaceship_module.y + this.directions[direction][1]
                    ]);
            }
        }

        return possible_connections;
    }

    getModulesConnectedTo(module: Module): Module[] {
        let connectedModules: Module[] = [];

        for (let [index, direction] of Object.entries(this.directions)) {
            if (!this.getModuleByPosition(module.x + direction[0], module.y + direction[1]))
                continue;

            if (module.connectors[index] === 0)
                continue;

            connectedModules.push(this.getModuleByPosition(module.x + direction[0], module.y + direction[1]));
        }

        return connectedModules;
    }

    getModulesByType(type: ModuleTypes): Module[] {
        return this.modules.filter((m) => m.type === type);
    }

    canAttack(): boolean {
        return this.getModulesByType(ModuleTypes.AttackModule).length !== 0;
    }

    damage(target: Module, weapon: Module): Module[] {
        let damage = weapon.strength;
        let destroyed: Module[] = [];

        if (this.activatedProtector) {
            if (this.activatedProtector.health > damage) {
                this.activatedProtector.health -= damage;

                return;
            } else {
                damage -= this.activatedProtector.health;

                destroyed.push(this.activatedProtector);
            }
        }

        target.health -= damage;

        if (target.health <= 0)
            destroyed.push(target);

        return destroyed;
    }

    hasWeapon(): boolean {
        for (let module of this.modules) {
            if (module.strength > 0)
                return true;
        }

        return false;
    }

    hasProtectors(): boolean {
        return this.getModulesByType(ModuleTypes.SmallQuantumProtector).length !== 0
            || this.getModulesByType(ModuleTypes.QuantumProtector).length !== 0;
    }

    hasDamagedModules(): boolean {
        for (let module of this.modules) {
            if (module.health != module.totalHealth) {
                return true;
            }
        }

        return false;
    }

    setProtector(protector: Module) {
        if (protector.type !== ModuleTypes.SmallQuantumProtector && protector.type !== ModuleTypes.QuantumProtector)
            throw new Error('Set protector called but module is not protector');

        this.activatedProtector = protector;
    }

    getUnconnectedModules(): Module[] {
        let unconnectedModules = this.modules;

        let addedModules: Module[] = [this.getModuleByPosition(0, 0)];

        do {
            let newAddedModules = [];

            for (let module of addedModules) {
                unconnectedModules = unconnectedModules.filter(m => (m.x !== module.x || m.y !== module.y));

                newAddedModules.push(...this.getModulesConnectedTo(module).filter(m => unconnectedModules.indexOf(m) !== -1));
            }

            addedModules = newAddedModules;
        } while (addedModules.length !== 0);

        return unconnectedModules;
    }

    hasRepairModule(): boolean {
        return this.getModulesByType(ModuleTypes.RepairModule).length !== 0;
    }

    static checkConfiguration(spaceship: Spaceship): boolean {
        for (let module of spaceship.modules) {
            if (!spaceship.canConnectModule(module))
                return false;
        }

        return true;
    }
}