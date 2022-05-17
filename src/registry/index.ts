export interface Registry<T> {
    first(pred: (T) => boolean): T | null;
    allBy(pred: (T) => boolean): T[];
    all(): T[];
}