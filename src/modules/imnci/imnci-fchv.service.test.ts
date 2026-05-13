import { FacilityContext } from "@/context/facility-context";
import { ImnciFchvService } from "./imnci-fchv.service";
import { ImnciFchvRepository } from "./imnci-fchv.repository";

/* eslint-disable @typescript-eslint/no-explicit-any */

jest.mock("./imnci-fchv.repository");

const context: FacilityContext = {
  facilityId: "fac-1",
  userId: "fchv-1",
  role: "fchvuser",
  userType: "fchv",
};

type Mocked = Record<string, jest.Mock<any, any>>;

function mockRepo(): Mocked {
  const repo: Mocked = {
    createScreening: jest.fn(),
    findScreeningById: jest.fn(),
    listScreenings: jest.fn(),
    dispense: jest.fn(),
    listDispensedForScreening: jest.fn(),
  };
  (ImnciFchvRepository as unknown as jest.Mock).mockImplementation(() => repo);
  return repo;
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ImnciFchvService.createScreening", () => {
  it("attaches the caller's user id as the FCHV who screened", async () => {
    const repo = mockRepo();
    repo.createScreening.mockResolvedValue({ id: "s-1" });

    const service = new ImnciFchvService(context);
    await service.createScreening({
      dangerSignsFound: ["lethargic"],
      referralRecommended: true,
      referralUrgency: "urgent",
    });

    expect(repo.createScreening).toHaveBeenCalledWith(
      expect.objectContaining({
        dangerSignsFound: ["lethargic"],
        referralRecommended: true,
        referralUrgency: "urgent",
      }),
      "fchv-1",
    );
  });
});

describe("ImnciFchvService.dispense", () => {
  it("rejects when the screening belongs to another FCHV", async () => {
    const repo = mockRepo();
    repo.findScreeningById.mockResolvedValue({
      id: "s-1",
      fchvUserId: "another-fchv",
    });

    const service = new ImnciFchvService(context);
    await expect(
      service.dispense("s-1", {
        commodity: "ors",
        quantity: 1,
        unit: "sachet",
      }),
    ).rejects.toThrow(/another FCHV/i);
    expect(repo.dispense).not.toHaveBeenCalled();
  });

  it("rejects when the screening is not found", async () => {
    const repo = mockRepo();
    repo.findScreeningById.mockResolvedValue(null);

    const service = new ImnciFchvService(context);
    await expect(
      service.dispense("s-1", {
        commodity: "ors",
        quantity: 1,
        unit: "sachet",
      }),
    ).rejects.toThrow(/screening not found/i);
  });

  it("dispenses against the caller's own screening", async () => {
    const repo = mockRepo();
    repo.findScreeningById.mockResolvedValue({
      id: "s-1",
      fchvUserId: "fchv-1",
    });
    repo.dispense.mockResolvedValue({ id: "d-1" });

    const service = new ImnciFchvService(context);
    const result = await service.dispense("s-1", {
      commodity: "zinc",
      quantity: 14,
      unit: "tablet",
    });

    expect(result).toEqual({ id: "d-1" });
    expect(repo.dispense).toHaveBeenCalledWith(
      "s-1",
      expect.objectContaining({ commodity: "zinc", quantity: 14, unit: "tablet" }),
    );
  });
});

describe("ImnciFchvService.listMyScreenings", () => {
  it("scopes the listing to the caller's user id", async () => {
    const repo = mockRepo();
    repo.listScreenings.mockResolvedValue({
      items: [],
      page: 1,
      pageSize: 30,
    });

    const service = new ImnciFchvService(context);
    await service.listMyScreenings({ page: 1, pageSize: 30 });

    expect(repo.listScreenings).toHaveBeenCalledWith(
      expect.objectContaining({ fchvUserId: "fchv-1" }),
    );
  });
});
