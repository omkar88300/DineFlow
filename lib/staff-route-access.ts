const ROLE_HOME_PATHS = {
  waiter: "/waiter",
  kitchen: "/kitchen",
  billing: "/billing",
} as const;

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

  if (pathname === homePath || pathname.startsWith(\`\${homePath}/\`)) {
    return null;
  }

  return homePath;
}
