import assert from "node:assert/strict";
import { describe, it } from "node:test";

import staffCreationAccess from "../.test-build/staff-creation-access.js";

const { getStaffCreationAuthState, getStaffCreationAdminState } =
  staffCreationAccess;

describe("staff creation authentication resolution", () => {
  it("accepts a verified user when Auth returns no error", () => {
    assert.equal(
      getStaffCreationAuthState(null, { id: "user-1" }),
      "authenticated"
    );
  });

  it("treats a missing session as unauthenticated", () => {
    assert.equal(getStaffCreationAuthState(null, null), "unauthenticated");
  });

  it("treats Supabase's missing-session error as unauthenticated", () => {
    assert.equal(
      getStaffCreationAuthState(
        { name: "AuthSessionMissingError", status: 400 },
        null
      ),
      "unauthenticated"
    );
  });

  it("treats an invalid or expired session response as unauthenticated", () => {
    assert.equal(
      getStaffCreationAuthState({ status: 401 }, null),
      "unauthenticated"
    );
  });

  it("treats known invalid-session error codes as unauthenticated", () => {
    for (const code of ["session_not_found", "bad_jwt"]) {
      assert.equal(
        getStaffCreationAuthState({ code }, null),
        "unauthenticated"
      );
    }
  });

  it("treats an Auth network failure as unavailable", () => {
    assert.equal(
      getStaffCreationAuthState(new Error("fetch failed"), null),
      "unavailable"
    );
  });

  it("treats Auth rate limiting as unavailable and retryable", () => {
    assert.equal(
      getStaffCreationAuthState({ status: 429 }, null),
      "unavailable"
    );
  });

  it("treats Auth server failures as unavailable", () => {
    assert.equal(
      getStaffCreationAuthState({ status: 503 }, null),
      "unavailable"
    );
  });
});

describe("staff creation admin authorization resolution", () => {
  it("authorizes an active admin", () => {
    assert.equal(
      getStaffCreationAdminState(null, { role: "admin", is_active: true }),
      "authorized"
    );
  });

  it("forbids a missing staff record", () => {
    assert.equal(getStaffCreationAdminState(null, null), "forbidden");
  });

  it("forbids an inactive admin", () => {
    assert.equal(
      getStaffCreationAdminState(null, { role: "admin", is_active: false }),
      "forbidden"
    );
  });

  it("forbids a non-admin staff member", () => {
    assert.equal(
      getStaffCreationAdminState(null, { role: "waiter", is_active: true }),
      "forbidden"
    );
  });

  it("treats a staff database lookup failure as unavailable", () => {
    assert.equal(
      getStaffCreationAdminState({ code: "PGRST000" }, null),
      "unavailable"
    );
  });
});
