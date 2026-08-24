/**
 * Module 3 — announcement scheduling, targeting, approval, and read analytics.
 *
 * The rules that decide when a broadcast goes out, who it reaches, and whether
 * it needs a second pair of eyes first.
 */
import assert from "assert";
import {
  AnnouncementError,
  MAX_SCHEDULE_AHEAD_MS,
  initialStatus,
  isDue,
  normalizeDraft,
  readRate,
  statusAfterApproval,
  targets,
  visibleTo,
} from "../../services/communities/announcements";
import { CommunityMember } from "../../data/yaysCommunities";

const now = new Date("2026-08-15T12:00:00.000Z");
const activeMember = { status: "active" } as Pick<CommunityMember, "status">;

describe("m3 · announcement drafts", () => {
  it("trims and keeps a valid draft", () => {
    const draft = normalizeDraft(
      { title: "  Meetup  ", body: "  Saturday at ten.  " },
      now
    );
    assert.strictEqual(draft.title, "Meetup");
    assert.strictEqual(draft.body, "Saturday at ten.");
    assert.strictEqual(draft.audience, "members");
    assert.strictEqual(draft.scheduledFor, null);
  });

  it("refuses a title or body that is too short", () => {
    assert.throws(
      () => normalizeDraft({ title: "hi", body: "long enough" }, now),
      AnnouncementError
    );
    assert.throws(
      () => normalizeDraft({ title: "Title", body: "no" }, now),
      AnnouncementError
    );
  });

  it("requires a region for a region-targeted announcement", () => {
    assert.throws(
      () =>
        normalizeDraft(
          { title: "Promo", body: "Local promo", audience: "region" },
          now
        ),
      AnnouncementError
    );
    const ok = normalizeDraft(
      { title: "Promo", body: "Local promo", audience: "region", region: " Nigeria " },
      now
    );
    assert.strictEqual(ok.region, "Nigeria");
  });

  it("treats a past schedule as publish-now rather than an error", () => {
    const draft = normalizeDraft(
      { title: "Notice", body: "Body text", scheduledFor: "2026-08-15T11:59:00.000Z" },
      now
    );
    assert.strictEqual(draft.scheduledFor, null);
  });

  it("keeps a future schedule", () => {
    const draft = normalizeDraft(
      { title: "Notice", body: "Body text", scheduledFor: "2026-08-16T09:00:00.000Z" },
      now
    );
    assert.ok(draft.scheduledFor instanceof Date);
    assert.strictEqual(draft.scheduledFor?.toISOString(), "2026-08-16T09:00:00.000Z");
  });

  it("rejects an unparseable date and an absurdly distant one", () => {
    assert.throws(
      () => normalizeDraft({ title: "Notice", body: "Body text", scheduledFor: "soon" }, now),
      AnnouncementError
    );
    const tooFar = new Date(now.getTime() + MAX_SCHEDULE_AHEAD_MS + 60_000);
    assert.throws(
      () =>
        normalizeDraft(
          { title: "Notice", body: "Body text", scheduledFor: tooFar.toISOString() },
          now
        ),
      AnnouncementError
    );
  });

  it("requires an action label and link to arrive together", () => {
    assert.throws(
      () =>
        normalizeDraft(
          { title: "Notice", body: "Body text", actionUrl: "https://example.com" },
          now
        ),
      AnnouncementError
    );
    assert.throws(
      () => normalizeDraft({ title: "Notice", body: "Body text", actionLabel: "Open" }, now),
      AnnouncementError
    );
    const ok = normalizeDraft(
      {
        title: "Notice",
        body: "Body text",
        actionLabel: "Open",
        actionUrl: "https://example.com",
      },
      now
    );
    assert.strictEqual(ok.actionLabel, "Open");
  });
});

describe("m3 · publishing approval", () => {
  it("publishes an unverified community's announcement immediately", () => {
    assert.strictEqual(
      initialStatus({ verified: false, actorIsStaff: false, scheduledFor: null }),
      "published"
    );
  });

  it("holds a non-staff publisher's official announcement for approval", () => {
    assert.strictEqual(
      initialStatus({ verified: true, actorIsStaff: false, scheduledFor: null }),
      "pending_approval"
    );
    // …even when it is scheduled: approval comes before the clock.
    assert.strictEqual(
      initialStatus({
        verified: true,
        actorIsStaff: false,
        scheduledFor: new Date(now.getTime() + 3_600_000),
      }),
      "pending_approval"
    );
  });

  it("lets staff of an official community publish without approval", () => {
    assert.strictEqual(
      initialStatus({ verified: true, actorIsStaff: true, scheduledFor: null }),
      "published"
    );
    assert.strictEqual(
      initialStatus({
        verified: true,
        actorIsStaff: true,
        scheduledFor: new Date(Date.now() + 3_600_000),
      }),
      "scheduled"
    );
  });

  it("sends an approved announcement to its schedule, or straight out", () => {
    assert.strictEqual(statusAfterApproval(null), "published");
    assert.strictEqual(
      statusAfterApproval(new Date(Date.now() + 3_600_000)),
      "scheduled"
    );
    assert.strictEqual(
      statusAfterApproval(new Date(Date.now() - 3_600_000)),
      "published"
    );
  });
});

describe("m3 · due announcements", () => {
  it("is due only when scheduled and the time has passed", () => {
    assert.strictEqual(
      isDue({ status: "scheduled", scheduledFor: new Date(now.getTime() - 1000) }, now),
      true
    );
    assert.strictEqual(
      isDue({ status: "scheduled", scheduledFor: new Date(now.getTime() + 1000) }, now),
      false
    );
    assert.strictEqual(
      isDue({ status: "pending_approval", scheduledFor: new Date(now.getTime() - 1000) }, now),
      false
    );
    assert.strictEqual(isDue({ status: "scheduled", scheduledFor: null }, now), false);
  });
});

describe("m3 · audience targeting", () => {
  it("reaches every active member for `all` and `members`", () => {
    assert.strictEqual(targets({ audience: "all", region: null }, activeMember), true);
    assert.strictEqual(
      targets({ audience: "members", region: null }, activeMember),
      true
    );
  });

  it("never reaches an inactive member", () => {
    for (const status of ["banned", "left", "removed"] as const) {
      assert.strictEqual(
        targets({ audience: "all", region: null }, { status }),
        false,
        `status ${status} should not be targeted`
      );
    }
  });

  it("matches a region case-insensitively and ignores surrounding space", () => {
    assert.strictEqual(
      targets({ audience: "region", region: "Nigeria" }, activeMember, " nigeria "),
      true
    );
    assert.strictEqual(
      targets({ audience: "region", region: "Nigeria" }, activeMember, "Ghana"),
      false
    );
  });

  it("excludes a member whose region is unknown from a region send", () => {
    assert.strictEqual(
      targets({ audience: "region", region: "Nigeria" }, activeMember, null),
      false
    );
    assert.strictEqual(
      targets({ audience: "region", region: "Nigeria" }, activeMember, ""),
      false
    );
  });
});

describe("m3 · announcement visibility", () => {
  it("shows published announcements to everyone", () => {
    assert.strictEqual(visibleTo({ status: "published" }, false), true);
  });

  it("hides drafts, schedules, and rejections from ordinary members", () => {
    for (const status of ["scheduled", "pending_approval", "rejected"] as const) {
      assert.strictEqual(visibleTo({ status }, false), false);
      assert.strictEqual(visibleTo({ status }, true), true);
    }
  });
});

describe("m3 · read analytics", () => {
  it("computes a read rate and never divides by zero", () => {
    assert.strictEqual(readRate({ readCount: 5, deliveredCount: 10 }), 0.5);
    assert.strictEqual(readRate({ readCount: 3, deliveredCount: 0 }), 0);
  });

  it("caps at 1 when reads outrun the delivery count", () => {
    assert.strictEqual(readRate({ readCount: 12, deliveredCount: 10 }), 1);
  });
});
