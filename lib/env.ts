type Environment = Readonly<Record<string, string | undefined>>;

function requiredValue(name: string, env: Environment): string {
  const value = env[name]?.trim();

  if (!value) {
    throw new Error("Missing required environment variable: " + name);
  }

  return value;
}

function requiredHttpUrl(name: string, env: Environment): string {
  const value = requiredValue(name, env);
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    throw new Error(name + " must be a valid HTTP or HTTPS URL.");
  }

  if (
    (parsed.protocol !== "http:" && parsed.protocol !== "https:") ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error(
      name +
        " must use HTTP or HTTPS and must not contain credentials, a query, or a fragment."
    );
  }

  return parsed.toString().replace(/\/+$/, "");
}

export function getSupabasePublicEnvironment(env: Environment) {
  return {
    url: requiredHttpUrl("NEXT_PUBLIC_SUPABASE_URL", env),
    publishableKey: requiredValue(
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      env
    ),
  };
}

export function getStaffCreationAdminEnvironment(env: Environment) {
  return {
    siteUrl: requiredHttpUrl("NEXT_PUBLIC_SITE_URL", env),
    serviceRoleKey: requiredValue("SUPABASE_SERVICE_ROLE_KEY", env),
  };
}
