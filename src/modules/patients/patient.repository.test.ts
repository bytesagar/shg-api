import { FacilityContext } from "../../context/facility-context";
import { PatientRepository } from "./patient.repository";

jest.mock("../../db", () => ({
  db: {
    select: jest.fn(),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { db } = require("../../db") as { db: { select: jest.Mock } };

const context: FacilityContext = {
  facilityId: "fac-1",
  userId: "user-1",
  role: "admin",
  userType: "user",
};

describe("PatientRepository.findDetailById", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when the patient does not exist or is in a different facility", async () => {
    // The first select() call is the parent fetch (patients JOIN persons).
    // Returning [] simulates either "no such patient" or "wrong facility".
    db.select.mockImplementationOnce(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () => Promise.resolve([]),
          }),
        }),
      }),
    }));

    const repo = new PatientRepository(context);
    const result = await repo.findDetailById("nonexistent-id");

    expect(result).toBeNull();
    // Important: we should NOT issue any child-relation queries when the
    // parent isn't found. That's the "do not return a partial object" rule.
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("merges parent + child relations and applies the empty-state contract", async () => {
    const personCreated = new Date("2025-01-01T00:00:00Z");

    // 1) Parent fetch (patients + persons).
    db.select.mockImplementationOnce(() => ({
      from: () => ({
        innerJoin: () => ({
          where: () => ({
            limit: () =>
              Promise.resolve([
                {
                  id: "patient-uuid",
                  patientId: "P-0001",
                  personId: "person-uuid",
                  service: "general",
                  education: null,
                  occupation: null,
                  occupationOther: null,
                  spouseName: null,
                  childrenMale: null,
                  childrenFemale: null,
                  status: "active",
                  facilityId: "fac-1",
                  assignedUserId: null,
                  createdAt: personCreated,
                  updatedAt: null,
                  personGender: "female",
                  personBloodGroup: "o_positive",
                  personBirthDate: new Date("1990-05-15T00:00:00Z"),
                  personDeceasedAt: null,
                  personStatus: "active",
                },
              ]),
          }),
        }),
      }),
    }));

    // 2) Five child-relation queries (names, contacts, addresses,
    //    person_identifiers, patient_identifiers) - in the order declared
    //    in patientDetailRelations. The personRelations and patientRelations
    //    split in findDetailById preserves declaration order within each
    //    group, so person_* run first then patient_*.
    const childResults: Array<Array<Record<string, unknown>>> = [
      // person_names: a flagged primary
      [
        {
          use: "official",
          given: "Asha",
          middle: null,
          family: "Sharma",
          prefix: null,
          __entityDetail__flag: true,
          __entityDetail__recency_0: personCreated,
          __entityDetail__recency_1: personCreated,
          __entityDetail__recency_2: "n-1",
        },
      ],
      // person_contacts: a flagged primary phone
      [
        {
          system: "phone",
          use: "mobile",
          value: "+9779800000000",
          rank: null,
          __entityDetail__flag: true,
          __entityDetail__recency_0: personCreated,
          __entityDetail__recency_1: personCreated,
          __entityDetail__recency_2: "c-1",
        },
      ],
      // person_addresses: empty -> null in response
      [],
      // person_identifiers: empty -> {} in response
      [],
      // patient_identifiers: one MRN
      [
        {
          system: "MRN",
          value: "MRN-12345",
          use: "official",
          periodStart: null,
          periodEnd: null,
          __entityDetail__group: "MRN",
          __entityDetail__recency_0: personCreated,
          __entityDetail__recency_1: personCreated,
          __entityDetail__recency_2: "pi-1",
        },
      ],
    ];

    db.select.mockImplementation(() => ({
      from: () => ({
        where: () => Promise.resolve(childResults.shift() ?? []),
      }),
    }));

    const repo = new PatientRepository(context);
    const result = await repo.findDetailById("patient-uuid");

    expect(result).not.toBeNull();
    expect(result!.id).toBe("patient-uuid");
    expect(result!.patientId).toBe("P-0001");
    // Convenience fields derived from the picked name row.
    expect(result!.firstName).toBe("Asha");
    expect(result!.lastName).toBe("Sharma");
    expect(result!.name).toBe("Asha Sharma");
    // Picked rows.
    expect(result!.nameRecord).toMatchObject({ given: "Asha", family: "Sharma" });
    expect(result!.primaryContact).toMatchObject({ system: "phone", value: "+9779800000000" });
    // Empty-state contracts.
    expect(result!.address).toBeNull();
    expect(result!.personIdentifiers).toEqual({});
    // Keyed map.
    expect(result!.patientIdentifiers).toEqual({
      MRN: expect.objectContaining({ system: "MRN", value: "MRN-12345" }),
    });
    // ISO-8601 dates.
    expect(result!.createdAt).toBe("2025-01-01T00:00:00.000Z");
    expect(result!.person.birthDate).toBe("1990-05-15T00:00:00.000Z");
  });
});
