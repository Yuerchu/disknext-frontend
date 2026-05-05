import fc from "fast-check";
import { buildAbility, emptyAbility, hasAnyAdminScope } from "./ability";

describe("buildAbility", () => {
  it("grants manage for wildcard action", () => {
    const ability = buildAbility(["files:*:own"]);
    expect(ability.can("create", "files")).toBe(true);
    expect(ability.can("read", "files")).toBe(true);
    expect(ability.can("delete", "files")).toBe(true);
    expect(ability.can("download", "files")).toBe(true);
  });

  it("grants specific action only", () => {
    const ability = buildAbility(["files:read:own"]);
    expect(ability.can("read", "files")).toBe(true);
    expect(ability.can("delete", "files")).toBe(false);
    expect(ability.can("write", "files")).toBe(false);
  });

  it("handles multiple scopes", () => {
    const ability = buildAbility(["files:read:own", "shares:create:own"]);
    expect(ability.can("read", "files")).toBe(true);
    expect(ability.can("create", "shares")).toBe(true);
    expect(ability.can("delete", "files")).toBe(false);
  });

  it("skips malformed scopes with less than 2 parts", () => {
    const ability = buildAbility(["invalid", "files:read:own"]);
    expect(ability.can("read", "files")).toBe(true);
  });

  it("handles admin.* namespaced resources", () => {
    const ability = buildAbility(["admin.users:read:all"]);
    expect(ability.can("read", "admin.users")).toBe(true);
    expect(ability.can("write", "admin.users")).toBe(false);
  });

  it("handles empty scopes array", () => {
    const ability = buildAbility([]);
    expect(ability.can("read", "files")).toBe(false);
  });

  it("handles scope with only 2 parts (no visibility)", () => {
    const ability = buildAbility(["files:read"]);
    expect(ability.can("read", "files")).toBe(true);
  });
});

describe("emptyAbility", () => {
  it("denies all actions", () => {
    const ability = emptyAbility();
    expect(ability.can("read", "files")).toBe(false);
    expect(ability.can("manage", "admin.users")).toBe(false);
  });
});

describe("hasAnyAdminScope", () => {
  it("returns true when admin scope present", () => {
    expect(hasAnyAdminScope(["files:read:own", "admin.users:read:all"])).toBe(true);
  });

  it("returns false with no admin scopes", () => {
    expect(hasAnyAdminScope(["files:read:own", "shares:create:own"])).toBe(false);
  });

  it("returns false for empty array", () => {
    expect(hasAnyAdminScope([])).toBe(false);
  });
});

// Property-based tests
describe("buildAbility property tests", () => {
  const resourceArb = fc.constantFrom("files", "shares", "webdav", "admin.users", "admin.groups");
  const actionArb = fc.constantFrom("create", "read", "write", "delete", "download");
  const visibilityArb = fc.constantFrom("own", "all");

  it("wildcard always grants manage", () => {
    fc.assert(
      fc.property(resourceArb, visibilityArb, (resource, vis) => {
        const ability = buildAbility([`${resource}:*:${vis}`]);
        return ability.can("manage", resource);
      }),
    );
  });

  it("specific action grants only that action", () => {
    fc.assert(
      fc.property(resourceArb, actionArb, actionArb, visibilityArb, (resource, granted, checked, vis) => {
        const ability = buildAbility([`${resource}:${granted}:${vis}`]);
        if (granted === checked) return ability.can(checked as "read", resource);
        return !ability.can(checked as "read", resource);
      }),
    );
  });

  it("never crashes on arbitrary scope strings", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (scopes) => {
        buildAbility(scopes);
        return true;
      }),
    );
  });

  it("hasAnyAdminScope is consistent with prefix check", () => {
    fc.assert(
      fc.property(fc.array(fc.string()), (scopes) => {
        const result = hasAnyAdminScope(scopes);
        const expected = scopes.some((s) => s.startsWith("admin."));
        return result === expected;
      }),
    );
  });
});
