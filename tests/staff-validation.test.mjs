import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { STAFF_ROLES, validateStaffPayload } from "../lib/staff-validation.ts";

const validPayload = {
  name: "Asha Patil",
  email: "asha@example.com",
  role: "waiter",
};

describe("validateStaffPayload", () => {
  it("rejects null, arrays, and primitive JSON values", () => {
    for (const body of [null, [], "staff", 42, true]) {
      assert.deepEqual(validateStaffPayload(body), {
        valid: false,
        error: "Request body must be a JSON object.",
      });
    }
  });

  it("rejects missing or non-string required fields", () => {
    for (const body of [
      {},
      { ...validPayload, name: 12 },
      { ...validPayload, email: null },
      { ...validPayload, role: ["waiter"] },
    ]) {
      assert.deepEqual(validateStaffPayload(body), {
        valid: false,
        error: "Name, email and role are required.",
      });
    }
  });

  it("rejects blank names and email addresses", () => {
    for (const body of [
      { ...validPayload, name: "   " },
      { ...validPayload, email: "   " },
    ]) {
      assert.deepEqual(validateStaffPayload(body), {
        valid: false,
        error: "Name and email cannot be empty.",
      });
    }
  });

  it("trims the name and normalizes the email address", () => {
    assert.deepEqual(
      validateStaffPayload({
        name: "  Asha Patil  ",
        email: "  ASHA@Example.COM  ",
        role: "waiter",
      }),
      {
        valid: true,
        value: {
          name: "Asha Patil",
          email: "asha@example.com",
          role: "waiter",
        },
      }
    );
  });

  it("accepts a name of exactly 100 characters", () => {
    assert.equal(
      validateStaffPayload({ ...validPayload, name: "A".repeat(100) }).valid,
      true
    );
  });

  it("rejects names longer than 100 characters", () => {
    assert.deepEqual(
      validateStaffPayload({ ...validPayload, name: "A".repeat(101) }),
      {
        valid: false,
        error: "Name must be 100 characters or fewer.",
      }
    );
  });

  it("rejects malformed email addresses", () => {
    for (const email of ["not-an-email", "missing-domain@", "a b@example.com"]) {
      assert.deepEqual(
        validateStaffPayload({ ...validPayload, email }),
        {
          valid: false,
          error: "Enter a valid email address.",
        }
      );
    }
  });

  it("rejects email addresses longer than 254 characters", () => {
    const email = "a".repeat(250) + "@x.co";

    assert.deepEqual(
      validateStaffPayload({ ...validPayload, email }),
      {
        valid: false,
        error: "Enter a valid email address.",
      }
    );
  });

  it("accepts every supported staff role", () => {
    for (const role of STAFF_ROLES) {
      const result = validateStaffPayload({ ...validPayload, role });

      assert.equal(result.valid, true);
      if (result.valid) {
        assert.equal(result.value.role, role);
      }
    }
  });

  it("rejects unsupported staff roles", () => {
    assert.deepEqual(
      validateStaffPayload({ ...validPayload, role: "owner" }),
      {
        valid: false,
        error: "Invalid staff role.",
      }
    );
  });
});
