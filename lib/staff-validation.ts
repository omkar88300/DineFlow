export const STAFF_ROLES = ["admin", "waiter", "kitchen", "billing"] as const;

export type StaffRole = (typeof STAFF_ROLES)[number];

export interface ValidStaffPayload {
  name: string;
  email: string;
  role: StaffRole;
}

export type StaffPayloadValidation =
  | { valid: true; value: ValidStaffPayload }
  | { valid: false; error: string };

export function validateStaffPayload(body: unknown): StaffPayloadValidation {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return { valid: false, error: "Request body must be a JSON object." };
  }

  const payload = body as Record<string, unknown>;

  if (
    typeof payload.name !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.role !== "string"
  ) {
    return { valid: false, error: "Name, email and role are required." };
  }

  const name = payload.name.trim();
  const email = payload.email.trim().toLowerCase();
  const role = payload.role;

  if (!name || !email) {
    return { valid: false, error: "Name and email cannot be empty." };
  }

  if (name.length > 100) {
    return {
      valid: false,
      error: "Name must be 100 characters or fewer.",
    };
  }

  if (
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  ) {
    return { valid: false, error: "Enter a valid email address." };
  }

  if (!STAFF_ROLES.includes(role as StaffRole)) {
    return { valid: false, error: "Invalid staff role." };
  }

  return {
    valid: true,
    value: { name, email, role: role as StaffRole },
  };
}
