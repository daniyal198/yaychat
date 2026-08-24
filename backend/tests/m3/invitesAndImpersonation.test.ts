/**
 * Module 3 — invite links and impersonation detection.
 *
 * Invite links are the only credential that bypasses a private community's
 * approval, so their expiry/use rules are worth pinning down; the impersonation
 * detector is what stops "Bitcoin Yay 0fficial" passing for the real thing.
 */
import assert from "assert";
import {
  communityUrl,
  generateInviteCode,
  inviteAppUrl,
  inviteRejection,
  inviteUrl,
  parseInviteCode,
  rejectionMessage,
  slugify,
} from "../../services/communities/inviteLinks";
import {
  SIMILARITY_THRESHOLD,
  claimsOfficial,
  detectImpersonation,
  editDistance,
  foldName,
  similarity,
} from "../../services/communities/impersonation";

const now = new Date("2026-08-15T12:00:00.000Z");

describe("m3 · invite codes", () => {
  it("mints codes of a fixed length from an unambiguous alphabet", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateInviteCode();
      assert.strictEqual(code.length, 12);
      assert.match(code, /^[a-hj-km-np-z2-9]+$/);
      // No 0/O/1/l/i — a code read over the phone has one spelling.
      assert.doesNotMatch(code, /[01loi]/);
    }
  });

  it("mints distinct codes", () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateInviteCode()));
    assert.strictEqual(codes.size, 200);
  });
});

describe("m3 · slugs and links", () => {
  it("makes a URL-safe slug from a name", () => {
    assert.strictEqual(slugify("Weekend Trail Runners"), "weekend-trail-runners");
    assert.strictEqual(slugify("  BTCY  Learners!! "), "btcy-learners");
    assert.strictEqual(slugify("Café Crème"), "cafe-creme");
    assert.strictEqual(slugify("???"), "community");
  });

  it("builds the web link, the app twin, and the plain community page", () => {
    assert.strictEqual(
      inviteUrl("trail-runners", "abcdef123456"),
      "https://yay.chat/c/trail-runners?i=abcdef123456"
    );
    assert.strictEqual(
      inviteAppUrl("trail-runners", "abcdef123456"),
      "yaychat://community/trail-runners?i=abcdef123456"
    );
    assert.strictEqual(communityUrl("trail-runners"), "https://yay.chat/c/trail-runners");
  });

  it("parses a code out of either link form or a bare code", () => {
    assert.strictEqual(
      parseInviteCode("https://yay.chat/c/trail-runners?i=abcdef123456"),
      "abcdef123456"
    );
    assert.strictEqual(
      parseInviteCode("yaychat://community/trail-runners?i=ABCDEF123456"),
      "abcdef123456"
    );
    assert.strictEqual(parseInviteCode("abcdef123456"), "abcdef123456");
    assert.strictEqual(parseInviteCode("https://yay.chat/c/trail-runners"), null);
    assert.strictEqual(parseInviteCode(""), null);
  });
});

describe("m3 · invite validity", () => {
  const invite = (overrides: any = {}) => ({
    revokedAt: null,
    expiresAt: null,
    maxUses: null,
    uses: 0,
    ...overrides,
  });

  it("accepts an unlimited, unexpired, unrevoked invite", () => {
    assert.strictEqual(inviteRejection(invite(), now), null);
  });

  it("rejects a revoked invite even when it has uses left", () => {
    assert.strictEqual(
      inviteRejection(invite({ revokedAt: new Date(), maxUses: 10 }), now),
      "revoked"
    );
  });

  it("rejects an expired invite, and accepts one expiring later", () => {
    assert.strictEqual(
      inviteRejection(invite({ expiresAt: new Date(now.getTime() - 1) }), now),
      "expired"
    );
    assert.strictEqual(
      inviteRejection(invite({ expiresAt: new Date(now.getTime() + 60_000) }), now),
      null
    );
  });

  it("rejects an exhausted invite at exactly its limit", () => {
    assert.strictEqual(inviteRejection(invite({ maxUses: 3, uses: 2 }), now), null);
    assert.strictEqual(
      inviteRejection(invite({ maxUses: 3, uses: 3 }), now),
      "exhausted"
    );
  });

  it("explains every rejection in words a member can act on", () => {
    for (const reason of ["revoked", "expired", "exhausted"] as const) {
      assert.ok(rejectionMessage(reason).length > 10);
    }
  });
});

describe("m3 · name folding", () => {
  it("folds digit and Cyrillic lookalikes onto their Latin letters", () => {
    assert.strictEqual(foldName("B1tc0in Yay"), "bitcoinyay");
    assert.strictEqual(foldName("Bitcoin Yay"), "bitcoinyay");
    // Cyrillic 'а', 'о', 'у', 'с' render identically to Latin.
    assert.strictEqual(foldName("Bitсoin Yау"), "bitcoinyay");
  });

  it("spots a claim of officialness", () => {
    assert.strictEqual(claimsOfficial("Bitcoin Yay Official"), true);
    assert.strictEqual(claimsOfficial("BTCY support"), true);
    assert.strictEqual(claimsOfficial("Weekend Trail Runners"), false);
  });

  it("measures edit distance and similarity", () => {
    assert.strictEqual(editDistance("kitten", "sitting"), 3);
    assert.strictEqual(editDistance("same", "same"), 0);
    assert.strictEqual(similarity("abcd", "abcd"), 1);
    assert.ok(similarity("bitcoinyay", "bitcoinyays") > SIMILARITY_THRESHOLD);
    assert.ok(similarity("bitcoinyay", "trailrunners") < SIMILARITY_THRESHOLD);
  });
});

describe("m3 · impersonation detection", () => {
  const verified = [
    { communityId: "c-btcy", name: "Bitcoin Yay", officialProduct: "Bitcoin Yay" },
    { communityId: "c-shop", name: "ShoperPal", officialProduct: "ShoperPal" },
  ];

  it("passes an unrelated name", () => {
    assert.deepStrictEqual(detectImpersonation("Weekend Trail Runners", verified), []);
  });

  it("flags a digit-substituted lookalike as confusable", () => {
    const flags = detectImpersonation("B1tc0in Yay", verified);
    assert.strictEqual(flags.length, 1);
    assert.strictEqual(flags[0].matchedCommunityId, "c-btcy");
    assert.strictEqual(flags[0].reason, "confusable");
    assert.strictEqual(flags[0].score, 1);
  });

  it("flags an exact duplicate name", () => {
    const flags = detectImpersonation("bitcoin yay", verified);
    assert.strictEqual(flags[0].reason, "exact");
  });

  it("flags a near-miss spelling", () => {
    const flags = detectImpersonation("Bitcoin Yayy", verified);
    assert.strictEqual(flags.length, 1);
    assert.strictEqual(flags[0].reason, "normalized");
  });

  it("flags a name that contains the product and claims to be its channel", () => {
    const flags = detectImpersonation("Bitcoin Yay Official Support", verified);
    assert.strictEqual(flags.length, 1);
    assert.strictEqual(flags[0].reason, "official_term");
    assert.strictEqual(flags[0].matchedName, "Bitcoin Yay");
  });

  it("leaves a legitimate community that merely mentions the product alone", () => {
    assert.deepStrictEqual(
      detectImpersonation("Bitcoin Yay Study Group", verified),
      []
    );
  });

  it("does not flag a verified community renaming itself", () => {
    assert.deepStrictEqual(
      detectImpersonation("Bitcoin Yay", verified, "c-btcy"),
      []
    );
  });

  it("returns the worst match first when several collide", () => {
    const flags = detectImpersonation("ShoperPal Official", [
      ...verified,
      { communityId: "c-shop2", name: "ShoperPal Official", officialProduct: "ShoperPal" },
    ]);
    assert.ok(flags.length >= 2);
    assert.strictEqual(flags[0].score >= flags[1].score, true);
    assert.strictEqual(flags[0].reason, "exact");
  });

  it("ignores an empty candidate name", () => {
    assert.deepStrictEqual(detectImpersonation("   ", verified), []);
  });
});
