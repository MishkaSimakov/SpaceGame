import Module, {ModuleTypes} from "./modules/Module";
import {MainModule, MainModuleType} from "./modules/MainModule";
import Vector2 from "./Vector2";

export default class Spaceship {
    directions: Record<string, [number, number]> = {
        'left': [-1, 0],
        'top': [0, -1],
        'right': [1, 0],
        'bottom': [0, 1]
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
        let filtered = this.getModulesByType(ModuleTypes.MainModule);

        if (!filtered.length)
            return undefined;

        return filtered[0] as MainModule;
    }

    getMainModuleType(): MainModuleType {
        return (this.getMainModule() as MainModule)?.mainModuleType;
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

            if (this.getConnectorInDirection(module, key) !== this.getConnectorInDirection(module_in_direction, this.opposites[key])) {
                return false;
            }

            if (this.getConnectorInDirection(module, key) !== 0)
                hasConnection = true;
        }

        return hasConnection || module.isMain;
    }

    getConnectorInDirection(module: Module, direction: string): number {
        let directions = ["right", "top", "left", "bottom"];

        let index = directions.indexOf(direction);

        index = (index + module.rotation) % 4;

        return module.connectors[directions[index]];
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
    getModuleByPosition(x: (number | Vector2), y?: number): Module {
        if (typeof x == "number") {
            return this.modules.filter(card => card.x === x && card.y === y)[0];
        } else if (x && x.x && x.y) {
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

    getPossibleRotationsFor(module: Module): number[] {
        const initRotation = module.rotation;
        let possibleRotations = [];

        for (let i = 0; i < 4; ++i) {
            module.rotation = i;

            if (this.canConnectModule(module, module.x, module.y))
                possibleRotations.push(i);
        }

        module.rotation = initRotation;

        return possibleRotations;
    }

    getModulesConnectedTo(module: Module): Module[] {
        let connectedModules: Module[] = [];

        for (let [index, direction] of Object.entries(this.directions)) {
            if (!this.getModuleByPosition(module.x + direction[0], module.y + direction[1]))
                continue;

            if (this.getConnectorInDirection(module, index) === 0)
                continue;

            connectedModules.push(this.getModuleByPosition(module.x + direction[0], module.y + direction[1]));
        }

        return connectedModules;
    }

    isAdjacent(first: Module, second: Module) {
        for (let module of this.getModulesConnectedTo(first)) {
            if (module === second)
                return true;
        }

        return false;
    }

    getModulesByType(type: ModuleTypes): Module[] {
        return this.modules.filter((m) => m.type === type);
    }

    canAttack(): boolean {
        return this.getModulesByType(ModuleTypes.AttackModule).length !== 0;
    }

    damage(target: Module, weapon: Module, byNuclearReactor: boolean)
    damage(target: Module, weapon: number, byNuclearReactor: boolean)
    damage(target: Module, weapon: Module | number, byNuclearReactor: boolean): {
        module: Module,
        byNuclearReactor: boolean
    }[] {
        let damage: number;
        if (typeof weapon == "number") {
            damage = weapon;
        } else {
            damage = weapon.strength;
        }

        let destroyed: {
            module: Module,
            byNuclearReactor: boolean
        }[] = [];

        if (this.activatedProtector && this.isAdjacent(target, this.activatedProtector)) {
            if (this.activatedProtector.health > damage) {
                this.activatedProtector.health -= damage;

                return;
            } else {
                damage -= this.activatedProtector.health;

                destroyed.push({
                    module: this.activatedProtector,
                    byNuclearReactor: byNuclearReactor
                });

                this.activatedProtector = undefined;
            }
        }

        target.health -= damage;

        if (target.health <= 0) {
            destroyed.push({
                module: target,
                byNuclearReactor: byNuclearReactor
            });

            if (target.type === ModuleTypes.NuclearReactor) {
                for (let module of this.getModulesConnectedTo(target)) {
                    // handle loop made of nuclear reactors (only one damage to all connected modules)
                    if (destroyed.filter((d) => d.module === module).length)
                        continue;

                    destroyed.push(
                        ...this.damage(module, 1, true)
                    );
                }
            }
        }

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
