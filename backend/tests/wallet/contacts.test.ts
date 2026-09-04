/**
 * "Invite friends" contact matching — run against an in-memory stand-in for
 * `UserService`, the same pattern `notificationDelivery.service`'s own tests
 * use, so the matching logic is exercised without a database.
 */
import assert from "assert";
import {
  ContactsUserLookup,
  YaysContactsService,
} from "../../services/yaysContacts.service";

const stubUsers = (rows: any[]): ContactsUserLookup => ({
  findSelect: async () => rows,
});

describe("YaysContactsService.match", () => {
  it("matches a contact by email", async () => {
    const service = new YaysContactsService(
      stubUsers([{ email: "ana@example.com", firstName: "Ana", username: "ana" }])
    );
    const result = await service.match("me@example.com", [
      { localId: "c1", emails: ["ANA@example.com"] },
    ]);
    assert.strictEqual(result.matched.length, 1);
    assert.strictEqual(result.matched[0].localId, "c1");
    assert.strictEqual(result.matched[0].email, "ana@example.com");
    assert.strictEqual(result.unmatchedCount, 0);
  });

  it("matches a contact by phone number regardless of formatting", async () => {
    const service = new YaysContactsService(
      stubUsers([{ email: "ben@example.com", phone: "+14155552671", firstName: "Ben" }])
    );
    const result = await service.match("me@example.com", [
      { localId: "c1", phones: ["(415) 555-2671"] },
    ]);
    assert.strictEqual(result.matched.length, 1);
    assert.strictEqual(result.matched[0].email, "ben@example.com");
  });

  it("reports contacts with no account as unmatched, not as errors", async () => {
    const service = new YaysContactsService(stubUsers([]));
    const result = await service.match("me@example.com", [
      { localId: "c1", emails: ["nobody@example.com"] },
      { localId: "c2", phones: ["+15550000000"] },
    ]);
    assert.strictEqual(result.matched.length, 0);
    assert.strictEqual(result.unmatchedCount, 2);
  });

  it("never matches the viewer's own account against their own contact card", async () => {
    const service = new YaysContactsService(
      stubUsers([{ email: "me@example.com", firstName: "Me" }])
    );
    const result = await service.match("me@example.com", [
      { localId: "c1", emails: ["me@example.com"] },
    ]);
    assert.strictEqual(result.matched.length, 0);
    assert.strictEqual(result.unmatchedCount, 1);
  });

  it("counts one contact as matched once, even if several of its numbers resolve to the same account", async () => {
    const service = new YaysContactsService(
      stubUsers([{ email: "carol@example.com", phone: "+15559998888", firstName: "Carol" }])
    );
    const result = await service.match("me@example.com", [
      { localId: "c1", phones: ["+15559998888", "5559998888"], emails: ["carol@example.com"] },
    ]);
    assert.strictEqual(result.matched.length, 1);
    assert.strictEqual(result.unmatchedCount, 0);
  });

  it("caps a request at MAX_CONTACTS_PER_REQUEST rather than querying an unbounded batch", async () => {
    const seen: any[] = [];
    const service = new YaysContactsService({
      findSelect: async (cond: any) => {
        seen.push(cond);
        return [];
      },
    });
    const contacts = Array.from({ length: 1500 }, (_, i) => ({
      localId: `c${i}`,
      emails: [`user${i}@example.com`],
    }));
    const result = await service.match("me@example.com", contacts);
    assert.strictEqual(result.unmatchedCount, 1000);
  });
});
