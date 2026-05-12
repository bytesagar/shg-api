import { flattenEntityDetail, pickRowFromCandidatesByKeys } from "./entity-detail";

jest.mock("../db", () => {
  const mockSelect = jest.fn();
  return {
    db: {
      select: mockSelect,
    },
    __mockSelect: mockSelect,
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { __mockSelect: mockSelect } = require("../db") as { __mockSelect: jest.Mock };

const RECENCY_KEYS = ["updatedAt", "createdAt", "id"];

const date = (iso: string) => new Date(iso);

describe("pickRowFromCandidatesByKeys", () => {
  describe("flagThenRecency", () => {
    it("prefers a flagged row even when it is older", () => {
      // flagged row is older than the unflagged one - flagged still wins.
      const rows = [
        {
          id: "a",
          isPrimary: true,
          updatedAt: date("2025-01-01T00:00:00Z"),
          createdAt: date("2025-01-01T00:00:00Z"),
          value: "flagged-old",
        },
        {
          id: "b",
          isPrimary: false,
          updatedAt: date("2026-04-01T00:00:00Z"),
          createdAt: date("2026-04-01T00:00:00Z"),
          value: "unflagged-new",
        },
      ];

      const picked = pickRowFromCandidatesByKeys(rows, {
        kind: "flagThenRecency",
        flagKey: "isPrimary",
        recencyKeys: RECENCY_KEYS,
      });

      expect(picked).toMatchObject({ value: "flagged-old" });
    });

    it("falls back to most recent when no rows are flagged", () => {
      const rows = [
        {
          id: "a",
          isPrimary: false,
          updatedAt: date("2025-06-01T00:00:00Z"),
          createdAt: date("2025-06-01T00:00:00Z"),
          value: "older",
        },
        {
          id: "b",
          isPrimary: false,
          updatedAt: date("2026-01-01T00:00:00Z"),
          createdAt: date("2026-01-01T00:00:00Z"),
          value: "newer",
        },
      ];

      const picked = pickRowFromCandidatesByKeys(rows, {
        kind: "flagThenRecency",
        flagKey: "isPrimary",
        recencyKeys: RECENCY_KEYS,
      });

      expect(picked).toMatchObject({ value: "newer" });
    });
  });

  describe("pureRecency", () => {
    it("returns the row with the newest updatedAt", () => {
      const rows = [
        {
          id: "a",
          updatedAt: date("2026-04-01T00:00:00Z"),
          createdAt: date("2025-01-01T00:00:00Z"),
          value: "older-update",
        },
        {
          id: "b",
          updatedAt: date("2026-05-10T12:00:00Z"),
          createdAt: date("2025-01-02T00:00:00Z"),
          value: "newer-update",
        },
      ];

      const picked = pickRowFromCandidatesByKeys(rows, {
        kind: "pureRecency",
        recencyKeys: RECENCY_KEYS,
      });

      expect(picked).toMatchObject({ value: "newer-update" });
    });

    it("treats edits as 'most recent', not just inserts", () => {
      // Row A was inserted first and never edited.
      // Row B was inserted later (so initially newer).
      const rowA = {
        id: "a",
        updatedAt: date("2025-01-01T00:00:00Z"),
        createdAt: date("2025-01-01T00:00:00Z"),
        value: "row-A",
      };
      const rowB = {
        id: "b",
        updatedAt: date("2025-06-01T00:00:00Z"),
        createdAt: date("2025-06-01T00:00:00Z"),
        value: "row-B",
      };

      // Initial state: B is newer -> B wins.
      expect(
        pickRowFromCandidatesByKeys([rowA, rowB], {
          kind: "pureRecency",
          recencyKeys: RECENCY_KEYS,
        }),
      ).toMatchObject({ value: "row-B" });

      // Now the user EDITS row A, which bumps its updatedAt.
      const rowAEdited = { ...rowA, updatedAt: date("2026-05-10T13:00:00Z") };

      // After the edit, A should win - proves "most recent" follows updates,
      // not insert order.
      expect(
        pickRowFromCandidatesByKeys([rowAEdited, rowB], {
          kind: "pureRecency",
          recencyKeys: RECENCY_KEYS,
        }),
      ).toMatchObject({ value: "row-A" });
    });
  });

  describe("mostRecentPerGroup", () => {
    it("returns one row per group, picking the newest within each", () => {
      const rows = [
        {
          id: "a",
          system: "MRN",
          value: "MRN-old",
          updatedAt: date("2025-01-01T00:00:00Z"),
          createdAt: date("2025-01-01T00:00:00Z"),
        },
        {
          id: "b",
          system: "MRN",
          value: "MRN-new",
          updatedAt: date("2026-04-01T00:00:00Z"),
          createdAt: date("2026-04-01T00:00:00Z"),
        },
        {
          id: "c",
          system: "NATIONAL_ID",
          value: "NID-only",
          updatedAt: date("2025-09-01T00:00:00Z"),
          createdAt: date("2025-09-01T00:00:00Z"),
        },
      ];

      const picked = pickRowFromCandidatesByKeys(rows, {
        kind: "mostRecentPerGroup",
        groupKey: "system",
        recencyKeys: RECENCY_KEYS,
      });

      expect(picked).toEqual({
        MRN: expect.objectContaining({ value: "MRN-new" }),
        NATIONAL_ID: expect.objectContaining({ value: "NID-only" }),
      });
    });

    it("returns an empty object when no rows exist", () => {
      const picked = pickRowFromCandidatesByKeys([], {
        kind: "mostRecentPerGroup",
        groupKey: "system",
        recencyKeys: RECENCY_KEYS,
      });

      expect(picked).toEqual({});
    });
  });

  describe("empty inputs", () => {
    it("returns null for single-row rules when there are no candidate rows", () => {
      const flag = pickRowFromCandidatesByKeys([], {
        kind: "flagThenRecency",
        flagKey: "isPrimary",
        recencyKeys: RECENCY_KEYS,
      });
      expect(flag).toBeNull();

      const recency = pickRowFromCandidatesByKeys([], {
        kind: "pureRecency",
        recencyKeys: RECENCY_KEYS,
      });
      expect(recency).toBeNull();
    });
  });
});

describe("flattenEntityDetail (integration with mocked db)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("merges parent + per-rule child results into a single object with the empty-state contract", async () => {
    // Three child relations, three planned db.select() calls. The mock
    // returns predetermined rows for each, so we can verify both the
    // single-object null case AND the keyed-map empty case.
    //
    // Order matches the order child relations are declared in the call below.
    const queue = [
      // 1) flagThenRecency on isPrimary - returns one flagged + one unflagged.
      [
        {
          line1: "Old House",
          isPrimary: false,
          __entityDetail__flag: false,
          __entityDetail__recency_0: date("2026-04-01T00:00:00Z"),
          __entityDetail__recency_1: date("2026-04-01T00:00:00Z"),
          __entityDetail__recency_2: "id-old",
        },
        {
          line1: "Primary House",
          isPrimary: true,
          __entityDetail__flag: true,
          __entityDetail__recency_0: date("2025-01-01T00:00:00Z"),
          __entityDetail__recency_1: date("2025-01-01T00:00:00Z"),
          __entityDetail__recency_2: "id-primary",
        },
      ],
      // 2) pureRecency - no rows -> null in response.
      [],
      // 3) mostRecentPerGroup - no rows -> {} in response.
      [],
    ];

    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () => Promise.resolve(queue.shift() ?? []),
      }),
    }));

    // Stub Drizzle column refs the helper expects.
    const stubCol = (name: string) => ({ name }) as any;

    const merged = await flattenEntityDetail(
      { id: "parent-1", coreField: "kept" },
      "parent-1",
      [
        {
          table: { _: { name: "addresses" } } as any,
          parentColumn: stubCol("person_id"),
          fields: { line1: stubCol("line1") },
          rule: { kind: "flagThenRecency", flagColumn: stubCol("is_primary") },
          recencyColumns: [stubCol("updated_at"), stubCol("created_at"), stubCol("id")],
          outputKey: "address",
        },
        {
          table: { _: { name: "names" } } as any,
          parentColumn: stubCol("person_id"),
          fields: { given: stubCol("given") },
          rule: { kind: "pureRecency" },
          recencyColumns: [stubCol("updated_at"), stubCol("created_at"), stubCol("id")],
          outputKey: "name",
        },
        {
          table: { _: { name: "identifiers" } } as any,
          parentColumn: stubCol("person_id"),
          fields: { value: stubCol("value") },
          rule: { kind: "mostRecentPerGroup", groupColumn: stubCol("system") },
          recencyColumns: [stubCol("updated_at"), stubCol("created_at"), stubCol("id")],
          outputKey: "identifiers",
        },
      ],
    );

    expect(merged.id).toBe("parent-1");
    expect(merged.coreField).toBe("kept");

    // Flagged-but-older address won.
    expect(merged.address).toEqual({ line1: "Primary House", isPrimary: true });

    // Empty-state contracts.
    expect(merged.name).toBeNull(); // single-row rule, no rows -> null
    expect(merged.identifiers).toEqual({}); // grouped rule, no rows -> {}
  });

  it("strips internal recency/flag/group keys from the output", async () => {
    mockSelect.mockImplementation(() => ({
      from: () => ({
        where: () =>
          Promise.resolve([
            {
              value: "MRN-001",
              system: "MRN",
              __entityDetail__group: "MRN",
              __entityDetail__recency_0: date("2026-05-01T00:00:00Z"),
              __entityDetail__recency_1: date("2026-05-01T00:00:00Z"),
              __entityDetail__recency_2: "id-1",
            },
          ]),
      }),
    }));

    const stubCol = (name: string) => ({ name }) as any;

    const merged = await flattenEntityDetail({ id: "p" }, "p", [
      {
        table: { _: { name: "ids" } } as any,
        parentColumn: stubCol("person_id"),
        fields: { value: stubCol("value"), system: stubCol("system") },
        rule: { kind: "mostRecentPerGroup", groupColumn: stubCol("system") },
        recencyColumns: [stubCol("updated_at"), stubCol("created_at"), stubCol("id")],
        outputKey: "identifiers",
      },
    ]);

    const ids = merged.identifiers as Record<string, Record<string, unknown>>;
    expect(ids.MRN).toEqual({ value: "MRN-001", system: "MRN" });
    // No internal keys leaked through.
    for (const key of Object.keys(ids.MRN)) {
      expect(key.startsWith("__entityDetail__")).toBe(false);
    }
  });
});
