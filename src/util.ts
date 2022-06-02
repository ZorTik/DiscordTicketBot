export interface Optional<T> {
    value: T | null;
    isEmpty(): boolean;
    isPresent(): boolean;
    get(): T | null;
}
export abstract class KeyValueStorage<K, V> {
    abstract set(key: K, value: V): void;
    abstract get(key: K): V | null;
    hasKey(key: K): boolean {
        return this.get(key) != null;
    }
}