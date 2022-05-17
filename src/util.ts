export interface Optional<T> {
    readonly value: T | null;
    isEmpty(): boolean;
    isPresent(): boolean;
    get(): T | null;
}