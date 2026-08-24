/**
 * Module 3 — the community permission matrix.
 *
 * These are the rules that decide who can delete someone else's post, who can
 * ban whom, and what a private community shows a stranger. All pure — no
 * database.
 */
import assert from "assert";
import {
  can,
  canActOnMember,
  canAssignRole,
  canReadContent,
  joinability,
  rankOf,
  viewerFor,
} from "../../services/communities/permissions";
import { CommunityMember, CommunityRole } from "../../data/yaysCommunities";

const community = (overrides: any = {}) => ({
  privacy: "public" as const,
  inviteOnly: false,
  archived: false,
  approvedPublisherLowers: [] as string[],
  ...overrides,
});

const membership = (
  role: CommunityRole,
  status: CommunityMember["status"] = "active"
): Pick<CommunityMember, "role" | "status"> => ({ role, status });

const viewer = (
  role: CommunityRole | null,
  options: {
    status?: CommunityMember["status"];
    platformAdmin?: boolean;
    publishers?: string[];
  } = {}
) =>
  viewerFor(
    community({ approvedPublisherLowers: options.publishers || [] }),
    role ? membership(role, options.status || "active") : null,
    "ana@example.com",
    options.platformAdmin || false
  );

describe("m3 · role ranks", () => {
  it("orders owner above admin above moderator above member", () => {
    assert.ok(rankOf("owner") > rankOf("admin"));
    assert.ok(rankOf("admin") > rankOf("moderator"));
    assert.ok(rankOf("moderator") > rankOf("member"));
    assert.strictEqual(rankOf(null), 0);
  });

  it("treats a left member as no member at all", () => {
    const left = viewer("admin", { status: "left" });
    assert.strictEqual(left.role, null);
    assert.strictEqual(can(left, "post"), false);
  });
});

describe("m3 · capabilities", () => {
  it("lets a member post, vote, and invite but not moderate", () => {
    const member = viewer("member");
    assert.strictEqual(can(member, "post"), true);
    assert.strictEqual(can(member, "vote"), true);
    assert.strictEqual(can(member, "invite"), true);
    assert.strictEqual(can(member, "moderate_content"), false);
    assert.strictEqual(can(member, "review_join_requests"), false);
    assert.strictEqual(can(member, "publish_announcement"), false);
  });

  it("lets a moderator moderate and review requests but not edit the community", () => {
    const moderator = viewer("moderator");
    assert.strictEqual(can(moderator, "moderate_content"), true);
    assert.strictEqual(can(moderator, "review_join_requests"), true);
    assert.strictEqual(can(moderator, "ban_member"), true);
    assert.strictEqual(can(moderator, "create_poll"), true);
    assert.strictEqual(can(moderator, "edit_community"), false);
    assert.strictEqual(can(moderator, "manage_roles"), false);
    assert.strictEqual(can(moderator, "publish_announcement"), false);
  });

  it("lets an admin publish and edit, and reserves deletion for the owner", () => {
    const admin = viewer("admin");
    assert.strictEqual(can(admin, "publish_announcement"), true);
    assert.strictEqual(can(admin, "edit_community"), true);
    assert.strictEqual(can(admin, "manage_publishers"), true);
    assert.strictEqual(can(admin, "delete_community"), false);
    assert.strictEqual(can(viewer("owner"), "delete_community"), true);
  });

  it("lets an approved publisher who is only a member publish", () => {
    const publisher = viewer("member", { publishers: ["ana@example.com"] });
    assert.strictEqual(can(publisher, "publish_announcement"), true);
    // …and nothing else that comes with staff rank.
    assert.strictEqual(can(publisher, "approve_announcement"), false);
    assert.strictEqual(can(publisher, "moderate_content"), false);
  });

  it("does not let an approved publisher who is not a member publish", () => {
    const stranger = viewer(null, { publishers: ["ana@example.com"] });
    assert.strictEqual(can(stranger, "publish_announcement"), false);
  });

  it("gives a platform admin moderation powers but never membership powers", () => {
    const platform = viewer(null, { platformAdmin: true });
    assert.strictEqual(can(platform, "moderate_content"), true);
    assert.strictEqual(can(platform, "ban_member"), true);
    assert.strictEqual(can(platform, "view_private"), true);
    assert.strictEqual(can(platform, "post"), false);
    assert.strictEqual(can(platform, "delete_community"), false);
  });

  it("stops a banned member from everything, including a banned platform admin", () => {
    const banned = viewer("admin", { status: "banned" });
    assert.strictEqual(banned.banned, true);
    assert.strictEqual(can(banned, "post"), false);
    assert.strictEqual(can(banned, "view_private"), false);

    const bannedAdmin = viewerFor(
      community(),
      membership("member", "banned"),
      "ana@example.com",
      true
    );
    assert.strictEqual(can(bannedAdmin, "moderate_content"), false);
    assert.strictEqual(can(bannedAdmin, "post"), false);
  });
});

describe("m3 · acting on other members", () => {
  it("lets staff act strictly downward", () => {
    const admin = viewer("admin");
    assert.strictEqual(canActOnMember(admin, "member", "ben@example.com"), true);
    assert.strictEqual(canActOnMember(admin, "moderator", "ben@example.com"), true);
    assert.strictEqual(canActOnMember(admin, "admin", "ben@example.com"), false);
  });

  it("protects the owner from everyone, platform admins included", () => {
    assert.strictEqual(canActOnMember(viewer("admin"), "owner", "ben@example.com"), false);
    assert.strictEqual(
      canActOnMember(viewer(null, { platformAdmin: true }), "owner", "ben@example.com"),
      false
    );
  });

  it("always lets a person act on themselves, which is how leaving works", () => {
    const member = viewer("member");
    assert.strictEqual(canActOnMember(member, "member", "ana@example.com"), true);
  });

  it("refuses a member acting on anyone else", () => {
    assert.strictEqual(canActOnMember(viewer("member"), "member", "ben@example.com"), false);
  });

  it("only lets the owner mint another admin, and nobody transfer ownership", () => {
    assert.strictEqual(canAssignRole(viewer("owner"), "admin"), true);
    assert.strictEqual(canAssignRole(viewer("admin"), "admin"), false);
    assert.strictEqual(canAssignRole(viewer("admin"), "moderator"), true);
    assert.strictEqual(canAssignRole(viewer("moderator"), "moderator"), false);
    assert.strictEqual(canAssignRole(viewer("owner"), "owner"), false);
    assert.strictEqual(
      canAssignRole(viewer(null, { platformAdmin: true }), "owner"),
      false
    );
  });
});

describe("m3 · reading a community", () => {
  it("shows a public community to anyone", () => {
    assert.strictEqual(canReadContent(community(), viewer(null)), true);
  });

  it("hides a private community from a non-member", () => {
    const priv = community({ privacy: "private" });
    assert.strictEqual(canReadContent(priv, viewer(null)), false);
    assert.strictEqual(canReadContent(priv, viewer("member")), true);
    assert.strictEqual(
      canReadContent(priv, viewer(null, { platformAdmin: true })),
      true
    );
  });

  it("hides even a public community from someone it banned", () => {
    assert.strictEqual(
      canReadContent(community(), viewer("member", { status: "banned" })),
      false
    );
  });
});

describe("m3 · joinability", () => {
  it("joins a public community instantly and requests a private one", () => {
    assert.deepStrictEqual(joinability(community(), viewer(null)), {
      ok: true,
      mode: "join",
    });
    assert.deepStrictEqual(
      joinability(community({ privacy: "private" }), viewer(null)),
      { ok: true, mode: "request" }
    );
  });

  it("refuses invite-only, archived, and banned cases with a reason", () => {
    const inviteOnly = joinability(community({ inviteOnly: true }), viewer(null));
    assert.strictEqual(inviteOnly.ok, false);
    assert.match(String(inviteOnly.reason), /invite-only/i);

    const archived = joinability(community({ archived: true }), viewer(null));
    assert.strictEqual(archived.ok, false);

    const banned = joinability(
      community(),
      viewer("member", { status: "banned" })
    );
    assert.strictEqual(banned.ok, false);
    assert.match(String(banned.reason), /banned/i);
  });
});
