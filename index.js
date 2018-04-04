let originalToString = Object.prototype.toString;
Object.prototype.toString = function () {
    let type = originalToString.call(this);
    if (type === "[object Map]" || type === "[object Set]") {
        type = "[object Object]"
    }
    return type
};

export const mapProto = Map.prototype;
export const mapMethods = Object.create(mapProto);
export const setProto = Set.prototype;
export const setMethods = Object.create(setProto);
export const mapKeys = Object.getOwnPropertyNames(mapMethods);
export const setKeys = Object.getOwnPropertyNames(setMethods);

export const hasProto = '__proto__' in {};

export function def(obj, key, val, enumerable?) {
    Object.defineProperty(obj, key, {
        value: val,
        enumerable: !!enumerable,
        writable: true,
        configurable: true
    })
}

export function protoAugment(target, src) {
    /* eslint-disable no-proto */
    target.__proto__ = src;
    /* eslint-enable no-proto */
}

export function copyAugment(target, src, keys) {
    keys.forEach(key => def(target, key, src[key]))
}

export const methodsToPatchMap = [
    "clear",
    "delete",
    "set"
];
export const methodsToPatchSet = [
    "clear",
    "delete",
    "add"
];

/**
 * Intercept mutating methods and emit events
 */
methodsToPatchMap.forEach(function (method) {
    // cache original method
    const original = mapProto[method];
    def(mapMethods, method, function mutator(...args) {
        const result = original.apply(this, args);
        console.log(args);
        const ob = this.__ob__;
        let inserted;
        switch (method) {
            case 'set':
                inserted = args;
                break
        }
        if (inserted) ob.walk(inserted)
        // notify change
        ob.dep.notify();
        return result
    })
});
methodsToPatchSet.forEach(function (method) {
    // cache original method
    const original = setProto[method];
    def(setMethods, method, function mutator(...args) {
        const result = original.apply(this, args);
        console.log(args);
        const ob = this.__ob__;
        let inserted;
        switch (method) {
            case 'add':
                inserted = args;
                break
        }
        if (inserted) ob.walk(inserted);
        // notify change
        ob.dep.notify();
        return result
    })
});

export function isIterable(object) {
    return object != null && typeof object[Symbol.iterator] === 'function';
}

export function install(Vue) {
    Vue = Vue || require("vue").default;

    Object.prototype.toString = originalToString;
    let Observer = (new Vue()).$data.__ob__.constructor;
    let oldWalk = Observer.prototype.walk;

    Observer.prototype.walk = function (obj) {
        if (!isIterable(obj)) {
            oldWalk(obj)
        } else {
            if (obj instanceof Map) {
                let augment = hasProto
                    ? protoAugment
                    : copyAugment;
                augment(obj, mapMethods, mapKeys);
            }
            if (obj instanceof Set) {
                let augment = hasProto
                    ? protoAugment
                    : copyAugment;
                augment(obj, setMethods, setKeys);
            }

            for (let i of obj) {
                this.observeArray([i]);
            }
        }
    };
}

export default {install}