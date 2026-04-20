import { db } from "../../db";
import { users } from "../../db/schema";
import { FacilityContext } from "../../context/facility-context";
import { FacilityRepository } from "../../core/facility-repository";
import { SQL, count, desc, eq, inArray } from "drizzle-orm";

export class UserRepository extends FacilityRepository {
  constructor(context: FacilityContext) {
    super(context, users.facilityId);
  }

  private userSelect = {
    id: users.id,
    email: users.email,
    username: users.username,
    firstName: users.firstName,
    lastName: users.lastName,
    userType: users.userType,
    phoneNumber: users.phoneNumber,
    designation: users.designation,
    callStatus: users.callStatus,
    facilityId: users.facilityId,
    municipalityId: users.municipalityId,
    userRoleId: users.userRoleId,
    specialization: users.specialization,
    nmcRegistrationNumber: users.nmcRegistrationNumber,
    signatureUrl: users.signatureUrl,
    createdAt: users.createdAt,
    updatedAt: users.updatedAt,
  };

  public async countAll(where?: SQL) {
    const result = await db
      .select({ count: count() })
      .from(users)
      .where(this.withFacilityScope(where));
    return Number(result[0]?.count ?? 0);
  }

  public async findAll(where?: SQL, opts?: { limit: number; offset: number }) {
    const base = db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(where));
    if (opts) {
      return base
        .orderBy(desc(users.createdAt))
        .limit(opts.limit)
        .offset(opts.offset);
    }
    return base;
  }

  /** Staff types that can appear on a facility roster (excludes global admins). */
  private static readonly rosterAssignableUserTypes = [
    "doctor",
    "user",
    "facility",
  ] as const;

  public async countAssignableForRoster() {
    return this.countAll(
      inArray(users.userType, UserRepository.rosterAssignableUserTypes),
    );
  }

  public async findAssignableForRoster(opts: {
    limit: number;
    offset: number;
  }) {
    return db
      .select(this.userSelect)
      .from(users)
      .where(
        this.withFacilityScope(
          inArray(users.userType, UserRepository.rosterAssignableUserTypes),
        ),
      )
      .orderBy(desc(users.createdAt))
      .limit(opts.limit)
      .offset(opts.offset);
  }

  public async findById(id: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(eq(users.id, id)))
      .limit(1);
    return result[0];
  }

  public async findByEmail(email: string) {
    const result = await db
      .select(this.userSelect)
      .from(users)
      .where(this.withFacilityScope(eq(users.email, email)))
      .limit(1);
    return result[0];
  }

  public async create(data: {
    email: string;
    username?: string | null;
    firstName: string;
    lastName: string;
    password: string;
    userType: "admin" | "user" | "facility" | "doctor";
    phoneNumber: string;
    designation?: string | null;
    municipalityId?: string | null;
    userRoleId?: string | null;
    specialization?: string | null;
    nmcRegistrationNumber?: string | null;
    signatureUrl?: string | null;
  }) {
    const inserted = await db
      .insert(users)
      .values({
        ...data,
        facilityId: this.context.facilityId,
      })
      .returning(this.userSelect);

    return inserted[0];
  }
}
