type ExcludeProperties<T extends object, K extends keyof T> = T[K] extends (
  ...args: any[]
) => any
  ? K
  : never;
type FilterMethods<T extends object> = keyof {
  [key in keyof T as ExcludeProperties<T, key>]: T[key];
};

type Emitter<T extends object> = {
  on: (methodName: FilterMethods<T>, callback: () => void) => number;
  off: (id: number) => void;
};

type WithEmitter<T extends object> = Emitter<T> & T;

const getUniqueId = () =>
  +((+new Date()).toString() + Math.round(Math.random() * 10000));

export const makeEmitted = <T extends { [key in any]: any }>(target: T) =>
  new Proxy(
    target,
    (() => {
      const observer = new EmitterUtility<T>();

      return {
        get: (target: T, p: any) => {
          if (p in observer) {
            return (observer as any)?.[p];
          }

          return typeof target?.[p] === "function"
            ? (...args: any[]) => {
                const result = (target?.[p] as any)?.call(target, ...args);
                observer.callListeners(p);

                return result;
              }
            : target?.[p];
        },
      };
    })()
  ) as unknown as WithEmitter<T>;

class EmitterUtility<T> {
  private observersMethods = new Map<number, () => void>();

  private observers = new Map<keyof T, Set<number>>();
  private idMethod = new Map<number, keyof T>();

  private getAllObserverIdsForMethod = (methodName: keyof T) =>
    this.observers.get(methodName);

  public callListeners = (methodName: keyof T) =>
    this.getAllObserverIdsForMethod(methodName)?.forEach((id) =>
      this.observersMethods.get(id)?.()
    );

  public on(methodName: keyof T, callback: () => void) {
    const id = getUniqueId();
    if (!this.observers.has(methodName)) {
      this.observers.set(methodName, new Set());
    }

    this.observers.get(methodName)?.add?.(id);
    this.observersMethods.set(id, callback);
    this.idMethod.set(id, methodName);

    return id;
  }

  public off = (id: number) => {
    const methodName = this.idMethod.get(id);
    if (!methodName) return;
    this.observers.get(methodName)?.delete?.(id);
    this.observersMethods?.delete(id);
  };
}

export default makeEmitted;
