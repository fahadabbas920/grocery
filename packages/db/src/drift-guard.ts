// Compile-time guard: the hand-written enums in @grocery/shared must stay in sync with
// the Postgres enums (as reflected in the generated types). If a migration changes an
// enum without updating @grocery/shared (or vice-versa), `pnpm typecheck` fails here.
// This file has no runtime output — it exists only for the type assertions.

import type { ORDER_STATUSES, USER_ROLES, STORE_ROLES } from "@grocery/shared";
import type { Database } from "./types.gen";

type Enums = Database["public"]["Enums"];

// Bidirectional equality: each set must be assignable to the other.
type MutuallyAssignable<A extends B, B extends C, C = A> = true;

// order_status
type _OrderStatus = MutuallyAssignable<(typeof ORDER_STATUSES)[number], Enums["order_status"]>;
// user_role
type _UserRole = MutuallyAssignable<(typeof USER_ROLES)[number], Enums["user_role"]>;
// store_role
type _StoreRole = MutuallyAssignable<(typeof STORE_ROLES)[number], Enums["store_role"]>;

// Reference the aliases so they aren't flagged as unused.
export type __DriftGuard = [_OrderStatus, _UserRole, _StoreRole];
