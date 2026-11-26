const ROLE_HOME_PATHS = {
  waiter: "/waiter",
  kitchen: "/kitchen",
  billing: "/billing",
} as const;

export type AuthResolutionState =
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

/**
 * Distinguishes a missing session from an Auth service lookup failure.
 */
export function getAuthResolutionState(
  error: unknown,
  user: unknown
): AuthResolutionState {
  if (error !== null && error !== undefined) {
    return "unavailable";
  }

  return user ? "authenticated" : "unauthenticated";
}

export type StaffResolutionState =
  | "authorized"
  | "unauthorized"
  | "unavailable";

/**
 * Distinguishes a missing/inactive staff record from a database lookup failure.
 */
export function getStaffResolutionState(
  error: unknown,
  staff: { is_active?: unknown } | null | undefined
): StaffResolutionState {
  if (error !== null && error !== undefined) {
    return "unavailable";
  }

  if (!staff || staff.is_active !== true) {
    return "unauthorized";
  }

  return "authorized";
}

/**
 * Returns the redirect path for a staff member who requests a protected route.
 * A null result means the role may continue to the requested path.
 */
export function getStaffRedirectPath(
  role: unknown,
  pathname: string
): string | null {
  if (role === "admin") {
    return null;
  }

  if (
    typeof role !== "string" ||
    !Object.prototype.hasOwnProperty.call(ROLE_HOME_PATHS, role)
  ) {
    return "/login";
  }

  const homePath = ROLE_HOME_PATHS[role as keyof typeof ROLE_HOME_PATHS];

  if (pathname === homePath || pathname.startsWith(`${homePath}/`)) {
    return null;
  }

  return homePath;
}
