import assert from "node:assert/strict";
import { describe, it } from "node:test";

import envModule from "../.test-build/env.js";

const { getSupabasePublicEnvironment, getStaffCreationAdminEnvironment } =
  envModule;

const validEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL: "https://demo.supabase.co/",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test-value",
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000/",
  SUPABASE_SERVICE_ROLE_KEY: "server-only-test-value",
};

describe("Supabase environment validation", () => {
  it("returns the Supabase URL without a trailing slash", () => {
    assert.deepEqual(getSupabasePublicEnvironment(validEnvironment), {
      url: "https://demo.supabase.co",
      publishableKey: "sb_publishable_test-value",
    });
  });

  it("rejects a missing Supabase URL with the variable name", () => {
    const env = { ...validEnvironment };
    delete env.NEXT_PUBLIC_SUPABASE_URL;

    assert.throws(
      () => getSupabasePublicEnvironment(env),
      /Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL/
    );
  });

  it("rejects blank public keys", () => {
    assert.throws(
      () =>
        getSupabasePublicEnvironment({
          ...validEnvironment,
          NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "  ",
        }),
      /Missing required environment variable: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/
    );
  });

  it("rejects non-HTTP protocols and URLs containing credentials", () => {
    for (const url of [
      "ftp://demo.supabase.co",
      "https://user:pass@demo.supabase.co",
    ]) {
      assert.throws(
        () =>
          getSupabasePublicEnvironment({
            ...validEnvironment,
            NEXT_PUBLIC_SUPABASE_URL: url,
          }),
        /NEXT_PUBLIC_SUPABASE_URL must use HTTP or HTTPS/
      );
    }
  });

  it("rejects URL query strings and fragments", () => {
    for (const url of [
      "https://demo.supabase.co?token=value",
      "https://demo.supabase.co#fragment",
    ]) {
      assert.throws(
        () =>
          getSupabasePublicEnvironment({
            ...validEnvironment,
            NEXT_PUBLIC_SUPABASE_URL: url,
          }),
        /NEXT_PUBLIC_SUPABASE_URL must use HTTP or HTTPS/
      );
    }
  });

  it("accepts local HTTP and preserves a configured site path", () => {
    assert.deepEqual(getStaffCreationAdminEnvironment({
      ...validEnvironment,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000/app/",
    }), {
      siteUrl: "http://localhost:3000/app",
      serviceRoleKey: "server-only-test-value",
    });
  });

  it("rejects a missing service-role key", () => {
    const env = { ...validEnvironment };
    delete env.SUPABASE_SERVICE_ROLE_KEY;

    assert.throws(
      () => getStaffCreationAdminEnvironment(env),
      /Missing required environment variable: SUPABASE_SERVICE_ROLE_KEY/
    );
  });

  it("rejects a missing or malformed site URL", () => {
    assert.throws(
      () =>
        getStaffCreationAdminEnvironment({
          ...validEnvironment,
          NEXT_PUBLIC_SITE_URL: "",
        }),
      /Missing required environment variable: NEXT_PUBLIC_SITE_URL/
    );

    assert.throws(
      () =>
        getStaffCreationAdminEnvironment({
          ...validEnvironment,
          NEXT_PUBLIC_SITE_URL: "javascript:alert(1)",
        }),
      /NEXT_PUBLIC_SITE_URL must use HTTP or HTTPS/
    );
  });
});
