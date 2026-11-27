export type StaffCreationAuthState =
  | "authenticated"
  | "unauthenticated"
  | "unavailable";

function getErrorName(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    typeof error.name === "string"
  ) {
    return error.name;
  }

  return undefined;
}

function getErrorCode(error: unknown): string | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return undefined;
}

function getErrorStatus(error: unknown): number | undefined {
  if (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof error.status === "number"
  ) {
    return error.status;
  }

  return undefined;
}

/**
 * Distinguishes an absent/invalid session from an unavailable Auth service.
 */
export function getStaffCreationAuthState(
  error: unknown,
  user: unknown
): StaffCreationAuthState {
  if (error === null || error === undefined) {
    return user ? "authenticated" : "unauthenticated";
  }

  if (
    getErrorName(error) === "AuthSessionMissingError" ||
    getErrorCode(error) === "session_not_found" ||
    getErrorCode(error) === "bad_jwt" ||
    getErrorStatus(error) === 401
  ) {
    return "unauthenticated";
  }

  return "unavailable";
}

export type StaffCreationAdminState =
  | "authorized"
  | "forbidden"
  | "unavailable";

export function getStaffCreationAdminState(
  error: unknown,
  staff: { role?: unknown; is_active?: unknown } | null | undefined
): StaffCreationAdminState {
  if (error !== null && error !== undefined) {
    return "unavailable";
  }

  if (!staff || staff.role !== "admin" || staff.is_active !== true) {
    return "forbidden";
  }

  return "authorized";
}
