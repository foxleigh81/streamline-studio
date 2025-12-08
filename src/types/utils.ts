/**
 * TypeScript Utility Types
 *
 * Common type utilities used throughout the application.
 *
 * @see /docs/adrs/004-typescript-configuration.md
 */

/**
 * Make specified keys required while keeping others optional.
 *
 * @example
 * ```ts
 * interface User {
 *   id?: string;
 *   name?: string;
 *   email?: string;
 * }
 *
 * type RequiredUser = RequireKeys<User, 'id' | 'email'>;
 * // { id: string; name?: string; email: string; }
 * ```
 */
export type RequireKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * Make all properties optional except specified keys.
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type PartialUser = PartialExcept<User, 'id'>;
 * // { id: string; name?: string; email?: string; }
 * ```
 */
export type PartialExcept<T, K extends keyof T> = Partial<Omit<T, K>> &
  Pick<T, K>;

/**
 * Make specified keys optional.
 *
 * @example
 * ```ts
 * interface User {
 *   id: string;
 *   name: string;
 *   email: string;
 * }
 *
 * type OptionalNameUser = OptionalKeys<User, 'name'>;
 * // { id: string; name?: string; email: string; }
 * ```
 */
export type OptionalKeys<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Create a union of all values in an object type.
 *
 * @example
 * ```ts
 * const STATUS = { ACTIVE: 'active', INACTIVE: 'inactive' } as const;
 * type StatusValue = ValueOf<typeof STATUS>;
 * // 'active' | 'inactive'
 * ```
 */
export type ValueOf<T> = T[keyof T];

/**
 * Get the type of array elements.
 *
 * @example
 * ```ts
 * type Numbers = number[];
 * type Num = ArrayElement<Numbers>;
 * // number
 * ```
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Create a type that represents a function that returns a promise of T.
 */
export type AsyncFunction<T> = () => Promise<T>;

/**
 * Strict omit that only allows keys that exist on the type.
 */
export type StrictOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/**
 * Make all properties deeply partial.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties deeply required.
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Make all properties readonly recursively.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Branded type for nominal typing.
 *
 * @example
 * ```ts
 * type UserId = Brand<string, 'UserId'>;
 * type WorkspaceId = Brand<string, 'WorkspaceId'>;
 *
 * const userId: UserId = 'abc' as UserId;
 * const workspaceId: WorkspaceId = userId; // Error!
 * ```
 */
export type Brand<T, B> = T & { __brand: B };
