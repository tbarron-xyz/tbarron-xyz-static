export class HashSet<T, HV> {
    hashFunction: (T: T) => HV;
    reverseHashFunction: (HV: HV) => T;
    valueSet: Set<HV>;
    constructor(hashFunction: (T: T) => HV, reverseHash: (HV: HV) => T, initialArray?: HV[]) {
        this.hashFunction = hashFunction;
        this.reverseHashFunction = reverseHash;
        if (initialArray) {
            this.valueSet = new Set(initialArray);
        } else {
            this.valueSet = new Set<HV>();
        }
    }

    add(newEl: T) {
        this.valueSet.add(this.hashFunction(newEl));
    }

    has(el: T) {
        return this.valueSet.has(this.hashFunction(el));
    }

    forEach(fn: (T: T) => void) {
        this.valueSet.forEach(x => fn(this.reverseHashFunction(x)));
    }

    toArray(): T[] {
        const returnArray: T[] = [];
        this.forEach(x => returnArray.push(x));
        return returnArray;
    }
}

export class JSONHashSet<T> extends HashSet<T, string> {
    constructor() {
        super(JSON.stringify, JSON.parse);
    }
}