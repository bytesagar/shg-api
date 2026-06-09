import { FacilityContext } from "../../context/facility-context";
import { isDoctor } from "../../constants/rbac";
import { RosterRepository } from "./roster.repository";
import { UserRepository } from "../users/user.repository";
import { NotificationService } from "../notifications/notification.service";
import {
  RosterBatchCreateInput,
  RosterCreateInput,
  RosterUpdateInput,
} from "../../validations/roster.validation";
import {
  isTimeWithinWindow,
  minutesSinceUtcMidnight,
  rosterSameDayWindowsOverlap,
  utcIsoDateFromInstant,
} from "../../utils/roster-time";
import type { PaginationQuery } from "../../utils/query-parser";
import { logger } from "../../utils/logger";

type RosterShiftSummary = {
  date: string;
  fromTime: string;
  toTime: string;
  service: string;
};

/** Stored on roster rows and required for telehealth booking checks. */
export const TELEHEALTH_ROSTER_SERVICE = "telehealth";



export class RosterService {
  private rosterRepository: RosterRepository;
  private userRepository: UserRepository;
  private notifications: NotificationService;

  constructor(private readonly context: FacilityContext) {
    this.rosterRepository = new RosterRepository(context);
    this.userRepository = new UserRepository(context);
    this.notifications = new NotificationService(context.userId);
  }

  private async publishShiftsAdded(
    recipientUserId: string,
    shifts: RosterShiftSummary[],
    moduleId: string | undefined,
  ) {
    try {
      await this.notifications.publish({
        kind: "roster.shifts.added",
        recipientUserIds: [recipientUserId],
        data: { shifts, moduleId },
      });
    } catch (err) {
      logger.error("rosters.notification_failed", {
        err,
        userId: recipientUserId,
      });
    }
  }

  /** Returns true if provider has an active roster covering scheduled time and service. */
  public async isUserOnRosterForBooking(params: {
    userId: string;
    scheduledAt: Date;
    service: string;
  }): Promise<boolean> {
    const isoDate = utcIsoDateFromInstant(params.scheduledAt);
    const rows = await this.rosterRepository.findForUserOnDay(
      params.userId,
      isoDate,
    );
    const scheduledMinutes = minutesSinceUtcMidnight(params.scheduledAt);

    for (const row of rows) {
      if (row.status !== "active") continue;
      if (row.deletedAt) continue;
      if (row.service !== params.service) continue;
      if (isTimeWithinWindow(scheduledMinutes, row.fromTime, row.toTime)) {
        return true;
      }
    }
    return false;
  }

  public async listRosters(query: {
    page: number;
    pageSize: number;
    fromDate?: string;
    toDate?: string;
    userId?: string;
    service?: string;
  }) {
    return this.rosterRepository.findMany({
      fromDate: query.fromDate,
      toDate: query.toDate,
      userId: query.userId,
      service: query.service,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
  }

  public async getById(id: string) {
    return this.rosterRepository.findById(id);
  }

  public async create(input: RosterCreateInput) {
    // `findById` already enforces tenant isolation with the correct
    // cross-facility carve-out: it returns the row for doctors (who are global
    // and carry no home `facilityId` — NULL by design) and `undefined` for any
    // other user type outside the active facility. Re-checking `user.facilityId`
    // here would wrongly reject doctors, so trust `findById`.
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      return { error: "USER_NOT_IN_FACILITY" as const };
    }

    const created = await this.rosterRepository.create({
      userId: input.userId,
      facilityId: this.context.facilityId,
      date: input.date,
      fromTime: input.fromTime,
      toTime: input.toTime,
      service: input.service,
      status: input.status ?? "active",
      createdBy: this.context.userId,
      updatedBy: this.context.userId,
    });

    if (created) {
      await this.publishShiftsAdded(
        input.userId,
        [
          {
            date: input.date,
            fromTime: input.fromTime,
            toTime: input.toTime,
            service: input.service,
          },
        ],
        created.id,
      );
    }

    return created;
  }

  /**
   * Create many shifts for one user in one request (matches "Create Roster" form with multiple rows).
   * All rows share the same status; facility per row must match the JWT facility when provided.
   */
  public async createBatch(input: RosterBatchCreateInput) {
    // `findById` already enforces tenant isolation with the correct
    // cross-facility carve-out: it returns the row for doctors (who are global
    // and carry no home `facilityId` — NULL by design) and `undefined` for any
    // other user type outside the active facility. Re-checking `user.facilityId`
    // here would wrongly reject doctors, so trust `findById`.
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      return { error: "USER_NOT_IN_FACILITY" as const };
    }

    // Facility rules differ by user type:
    //  - Doctors are global and rosterable at ANY facility. There's nothing to
    //    pre-validate (the NOT NULL FK on `rosters.facilityId` already
    //    guarantees the facility exists), and requiring a prior affiliation
    //    would defeat cross-facility rostering — a doctor is affiliated with
    //    only their creation facility, if any. Instead we auto-affiliate them
    //    to each rostered facility below, since a roster slot *is* an
    //    assignment and the doctor needs facility access to work it.
    //  - Facility-pinned staff may only be rostered at their own home facility.
    const userIsDoctor = isDoctor(user.role?.name);

    const status = input.status ?? "active";
    const indicesByDate = new Map<string, number[]>();
    input.entries.forEach((e, idx) => {
      const list = indicesByDate.get(e.date) ?? [];
      list.push(idx);
      indicesByDate.set(e.date, list);
    });
    for (const [, indices] of indicesByDate) {
      for (let i = 0; i < indices.length; i++) {
        for (let j = i + 1; j < indices.length; j++) {
          const a = input.entries[indices[i]!]!;
          const b = input.entries[indices[j]!]!;
          if (
            rosterSameDayWindowsOverlap(
              a.fromTime,
              a.toTime,
              b.fromTime,
              b.toTime,
            )
          ) {
            return {
              error: "OVERLAPPING_ROSTER_ENTRIES" as const,
              date: a.date,
            };
          }
        }
      }
    }

    const rows = [];
    for (const entry of input.entries) {
      const facilityId = entry.facilityId ?? this.context.facilityId;
      if (!userIsDoctor && facilityId !== user.facilityId) {
        return { error: "FACILITY_NOT_ALLOWED" as const, facilityId };
      }
      rows.push({
        userId: input.userId,
        facilityId,
        date: entry.date,
        fromTime: entry.fromTime,
        toTime: entry.toTime,
        service: entry.service,
        status,
        createdBy: this.context.userId,
        updatedBy: this.context.userId,
      });
    }

    // Rostering a global doctor at a facility *is* assigning them there, so
    // make sure they're affiliated with every facility in this batch (idempotent
    // — existing affiliations are left untouched). Without this they couldn't
    // switch their facility context to actually work the slot.
    if (userIsDoctor) {
      const facilityIds = [...new Set(rows.map((r) => r.facilityId))];
      await this.userRepository.affiliateToFacilities(
        input.userId,
        facilityIds,
      );
    }

    const items = await this.rosterRepository.createMany(rows);

    if (items.length) {
      await this.publishShiftsAdded(
        input.userId,
        input.entries.map((e) => ({
          date: e.date,
          fromTime: e.fromTime,
          toTime: e.toTime,
          service: e.service,
        })),
        items[0]?.id,
      );
    }

    return { items };
  }

  public async listAssignableUsers(query: PaginationQuery) {
    const total = await this.userRepository.countAssignableForRoster();
    const items = await this.userRepository.findAssignableForRoster({
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    });
    return { items, total };
  }

  public async update(id: string, input: RosterUpdateInput) {
    const existing = await this.rosterRepository.findById(id);
    if (!existing) return { error: "NOT_FOUND" as const };

    const patch: {
      updatedBy: string;
      date?: string;
      fromTime?: string;
      toTime?: string;
      service?: string;
      status?: "active" | "inactive";
      updatedAt: Date;
    } = {
      updatedBy: this.context.userId,
      updatedAt: new Date(),
    };
    if (input.date !== undefined) {
      patch.date = input.date;
    }
    if (input.fromTime !== undefined) patch.fromTime = input.fromTime;
    if (input.toTime !== undefined) patch.toTime = input.toTime;
    if (input.service !== undefined) patch.service = input.service;
    if (input.status !== undefined) patch.status = input.status;

    return this.rosterRepository.updateById(id, patch);
  }

  public async remove(id: string) {
    const existing = await this.rosterRepository.findById(id);
    if (!existing) return { error: "NOT_FOUND" as const };
    return this.rosterRepository.softDeleteById(id, this.context.userId);
  }

  /** Users with at least one active roster slot on the given UTC calendar day. */
  public async listAvailableProviders(query: {
    date: string;
    service?: string;
    atTime?: string;
  }) {
    const slots = await this.rosterRepository.findActiveSlotsOnDay({
      date: query.date,
      service: query.service,
    });

    let filtered = slots;
    if (query.atTime) {
      const parts = query.atTime.trim().split(":");
      const hh = Number(parts[0]);
      const mm = Number(parts[1] ?? "0");
      if (Number.isNaN(hh) || Number.isNaN(mm) || hh > 23 || mm > 59) {
        return { error: "INVALID_AT_TIME" as const };
      }
      const atMinutes = hh * 60 + mm;
      filtered = slots.filter((s) =>
        isTimeWithinWindow(atMinutes, s.fromTime, s.toTime),
      );
    }

    const userIds = [...new Set(filtered.map((s) => s.userId))];
    const usersOut = [];
    for (const uid of userIds) {
      const u = await this.userRepository.findById(uid);
      if (u) {
        usersOut.push({
          id: u.id,
          firstName: u.firstName,
          lastName: u.lastName,
          email: u.email,
          userType: u.userType,
          designation: u.designation,
          specialization: u.specialization,
        });
      }
    }

    return {
      date: query.date,
      users: usersOut,
      slots: filtered.map((s) => ({
        id: s.id,
        userId: s.userId,
        fromTime: s.fromTime,
        toTime: s.toTime,
        service: s.service,
      })),
    };
  }
}
