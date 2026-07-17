import {Utils} from "./Utils";

export const Factory = {
    addGetterSetter(constructor, attr, def?) {
        this.addGetter(constructor, attr, def);
        this.addSetter(constructor, attr);

        this.addOverloadedGetterSetter(constructor, attr, def);
    },
    addGetter(constructor, attr, def?) {
        const method = 'get' + Utils.capitalize(attr);

        if (!constructor.prototype[method])
            this.overwriteGetter(constructor, attr, def);
    },
    addSetter(constructor, attr) {
        const method = 'set' + Utils.capitalize(attr);

        if (!constructor.prototype[method])
            this.overwriteSetter(constructor, attr);
    },
    overwriteGetter(constructor, attr, def?) {
        const method = 'get' + Utils.capitalize(attr);

        constructor.prototype[method] = function () {
            return this.attrs[attr] ?? def;
        };
    },
    overwriteSetter(constructor, attr) {
        const method = 'set' + Utils.capitalize(attr);

        constructor.prototype[method] = function (value) {
            this.setAttr(attr, value);

            return this;
        };
    },
    addOverloadedGetterSetter(constructor, attr) {
        const getter = 'get' + Utils.capitalize(attr);
        const setter = 'set' + Utils.capitalize(attr);

        constructor.prototype[attr] = function (...args: any[]) {
            if (args.length) {
                this[setter](args[0]);

                return this;
            }

            return this[getter]();
        };
    }
};
