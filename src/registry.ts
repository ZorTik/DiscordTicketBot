export interface Registry<T> {
    first(pred: (arg0: T) => boolean): T | null;
    allBy(pred: (arg0: T) => boolean): T[];
    all(): T[];
}