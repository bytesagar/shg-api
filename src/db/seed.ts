import "dotenv/config";
import { readFileSync } from "fs";
import { join } from "path";
import { db } from "./index";
import {
  appointments,
  attachments,
  child_immunizations,
  complaints,
  confirm_diagnoses,
  consents,
  encounters,
  family_plannings,
  growths,
  health_facilities,
  histories,
  icd11_codes,
  immunization_histories,
  medications,
  patient_identifiers,
  patients,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
  pregnancies,
  provisional_diagnoses,
  practitioner_role_assignments,
  practitioners,
  rosters,
  telehealth_sessions,
  tests,
  treatments,
  user_role_assignments,
  user_roles,
  users,
  visits,
  vitals,
} from "./schema";
import * as bcrypt from "bcryptjs";
import { and, eq, sql } from "drizzle-orm";

/** Canonical roles for `user_roles`; idempotent by `name`. */
const DEFAULT_USER_ROLES: { name: string; description: string }[] = [
  { name: "admin", description: "Administrator" },
  { name: "doctor", description: "Doctor" },
  { name: "hfuser", description: "Health Facility User" },
  { name: "fchvuser", description: "FCHV User" },
  { name: "municipalityuser", description: "Municipality User" },
  { name: "palika", description: "palika user" },
];

async function seedUserRoles() {
  console.log("🌱 Seeding user roles...");
  const now = new Date();
  for (const role of DEFAULT_USER_ROLES) {
    const existing = await db
      .select({ id: user_roles.id })
      .from(user_roles)
      .where(eq(user_roles.name, role.name))
      .limit(1);

    if (existing[0]) {
      await db
        .update(user_roles)
        .set({ description: role.description, updatedAt: now })
        .where(eq(user_roles.id, existing[0].id));
      console.log(`  ↳ User role '${role.name}' updated`);
    } else {
      await db.insert(user_roles).values({
        name: role.name,
        description: role.description,
        updatedAt: now,
      });
      console.log(`  ↳ User role '${role.name}' created`);
    }
  }
  console.log("✅ User roles seeded");
}

async function seedIcd11Codes() {
  console.log("🌱 Seeding ICD-11 codes...");
  const filePath = join(__dirname, "../../data/icd11-nepal-common.json");
  const raw = readFileSync(filePath, "utf-8");
  const parsed = JSON.parse(raw) as {
    metadata?: { source?: string; generated?: string };
    codes: { code: string; title: string; category: string }[];
  };

  if (parsed.metadata?.source) {
    console.log(
      `  ↳ ICD-11 metadata: source=${parsed.metadata.source}, generated=${parsed.metadata?.generated ?? "n/a"}`,
    );
  }

  const rows = parsed.codes.map((c) => ({
    code: c.code,
    title: c.title,
    category: c.category,
  }));

  const batchSize = 50;
  for (let i = 0; i < rows.length; i += batchSize) {
    const chunk = rows.slice(i, i + batchSize);
    await db
      .insert(icd11_codes)
      .values(chunk)
      .onConflictDoUpdate({
        target: icd11_codes.code,
        set: {
          title: sql`excluded.title`,
          category: sql`excluded.category`,
        },
      });
  }

  console.log(`✅ ICD-11 codes seeded (${rows.length} rows)`);
}

async function seed() {
  await seedUserRoles();
  await seedIcd11Codes();

  console.log("🌱 Seeding health facilities...");

  const facilityData = {
    name: "Main Health Center",
    address: "123 Health St",
    phone: "9800000010",
    email: "contact@healthcenter.com",
    ward: "1",
    palika: "Kathmandu",
    district: "Kathmandu",
    province: "Bagmati",
    inchargeName: "Dr. Health",
    
  };

  const [existingFacility] = await db
    .select({ id: health_facilities.id })
    .from(health_facilities)
    .where(eq(health_facilities.name, facilityData.name))
    .limit(1);

  const facilityId =
    existingFacility?.id ||
    (
      await db
        .insert(health_facilities)
        .values(facilityData)
        .returning({ id: health_facilities.id })
    )[0].id;

  console.log(`✅ Facility ${facilityData.name} seeded`);

  console.log("🌱 Seeding users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const usersData = [
    {
      email: "admin@shg.com",
      username: "admin",
      firstName: "Admin",
      lastName: "SHG",
      passwordHash: hashedPassword,
      userType: "admin" as const,
      phoneNumber: "9800000000",
      facilityId,
      roleName: "admin",
    },
    {
      email: "doctor@shg.com",
      username: "doctor",
      firstName: "Suman",
      lastName: "Karki",
      passwordHash: hashedPassword,
      userType: "doctor" as const,
      phoneNumber: "9800000001",
      facilityId,
      designation: "Medical Officer",
      specialization: "General Medicine",
      roleName: "doctor",
    },
    {
      email: "hfuser@shg.com",
      username: "hfuser",
      firstName: "Nira",
      lastName: "Shrestha",
      passwordHash: hashedPassword,
      userType: "facility" as const,
      phoneNumber: "9800000002",
      facilityId,
      roleName: "hfuser",
    },
    {
      email: "fchv@shg.com",
      username: "fchv",
      firstName: "Mina",
      lastName: "BK",
      passwordHash: hashedPassword,
      userType: "user" as const,
      phoneNumber: "9800000003",
      facilityId,
      roleName: "fchvuser",
    },
    {
      email: "municipality@shg.com",
      username: "municipality",
      firstName: "Ramesh",
      lastName: "Adhikari",
      passwordHash: hashedPassword,
      userType: "user" as const,
      phoneNumber: "9800000004",
      facilityId,
      roleName: "municipalityuser",
    },
  ];

  try {
    const roleMapRows = await db
      .select({ id: user_roles.id, name: user_roles.name })
      .from(user_roles);
    const roleMap = new Map(roleMapRows.map((row) => [row.name, row.id]));

    const userIdByEmail = new Map<string, string>();
    const userPersonIdByEmail = new Map<string, string>();

    for (const u of usersData) {
      const existingUser = await db
        .select({ id: users.id, personId: users.personId })
        .from(users)
        .where(eq(users.email, u.email))
        .limit(1);

      let personId = existingUser[0]?.personId;
      if (!personId) {
        const insertedPerson = await db
          .insert(persons)
          .values({ status: "active" })
          .returning({ id: persons.id });
        personId = insertedPerson[0].id;
      }

      const existingName = await db
        .select({ id: person_names.id })
        .from(person_names)
        .where(eq(person_names.personId, personId))
        .limit(1);
      if (!existingName[0]) {
        await db.insert(person_names).values({
          personId,
          use: "official",
          given: u.firstName,
          family: u.lastName,
          isPrimary: true,
        });
      }

      const existingContact = await db
        .select({ id: person_contacts.id })
        .from(person_contacts)
        .where(eq(person_contacts.personId, personId))
        .limit(1);
      if (!existingContact[0]) {
        await db.insert(person_contacts).values({
          personId,
          system: "phone",
          use: "mobile",
          value: u.phoneNumber,
          isPrimary: true,
        });
      }

      const [upsertedUser] = await db
        .insert(users)
        .values({
          email: u.email,
          username: u.username,
          firstName: u.firstName,
          lastName: u.lastName,
          passwordHash: u.passwordHash,
          userType: u.userType,
          phoneNumber: u.phoneNumber,
          designation: u.designation,
          specialization: u.specialization,
          facilityId: u.facilityId,
          personId,
        })
        .onConflictDoUpdate({
          target: users.email,
          set: {
            facilityId: u.facilityId,
            personId,
            passwordHash: u.passwordHash,
            userType: u.userType,
            updatedAt: new Date(),
          },
        })
        .returning({ id: users.id });

      userIdByEmail.set(u.email, upsertedUser.id);
      userPersonIdByEmail.set(u.email, personId);

      const roleId = roleMap.get(u.roleName);
      if (roleId) {
        await db
          .insert(user_role_assignments)
          .values({
            userId: upsertedUser.id,
            roleId,
            facilityId: u.facilityId,
            isPrimary: true,
          })
          .onConflictDoNothing();
      }

      console.log(`✅ User ${u.username} seeded/updated`);
    }

    const doctorId = userIdByEmail.get("doctor@shg.com");
    const doctorPersonId = userPersonIdByEmail.get("doctor@shg.com");
    const fchvId = userIdByEmail.get("fchv@shg.com");
    const adminId = userIdByEmail.get("admin@shg.com");
    const hfUserId = userIdByEmail.get("hfuser@shg.com");

    if (!doctorId || !doctorPersonId || !adminId || !hfUserId) {
      throw new Error("Missing required demo users after seeding users");
    }

    const [existingPractitioner] = await db
      .select({ id: practitioners.id })
      .from(practitioners)
      .where(eq(practitioners.userId, doctorId))
      .limit(1);
    const practitionerId =
      existingPractitioner?.id ||
      (
        await db
          .insert(practitioners)
          .values({
            userId: doctorId,
            personId: doctorPersonId,
            active: true,
          })
          .returning({ id: practitioners.id })
      )[0].id;

    const [existingPractitionerRole] = await db
      .select({ id: practitioner_role_assignments.id })
      .from(practitioner_role_assignments)
      .where(
        and(
          eq(practitioner_role_assignments.practitionerId, practitionerId),
          eq(practitioner_role_assignments.roleCode, "doctor"),
          eq(practitioner_role_assignments.facilityId, facilityId),
        ),
      )
      .limit(1);
    if (!existingPractitionerRole) {
      await db.insert(practitioner_role_assignments).values({
        practitionerId,
        facilityId,
        roleCode: "doctor",
        specialty: "general-medicine",
        active: true,
      });
    }

    console.log("🌱 Seeding patients and person data...");
    const patientSeedRows = [
      {
        patientCode: "SHG-P-000001",
        firstName: "Asha",
        lastName: "Khadka",
        gender: "female" as const,
        birthDate: new Date("1998-09-12T00:00:00.000Z"),
        phone: "9811111111",
        service: "OPD",
        assignedUserId: doctorId,
        personIdentifier: {
          system: "urn:np:national-id",
          value: "NID-9801010001",
        },
      },
      {
        patientCode: "SHG-P-000002",
        firstName: "Kiran",
        lastName: "Thapa",
        gender: "male" as const,
        birthDate: new Date("1992-02-20T00:00:00.000Z"),
        phone: "9822222222",
        service: "General",
        assignedUserId: doctorId,
        personIdentifier: {
          system: "urn:np:national-id",
          value: "NID-9801010002",
        },
      },
      {
        patientCode: "SHG-P-000003",
        firstName: "Mina",
        lastName: "BK",
        gender: "female" as const,
        birthDate: new Date("2000-06-03T00:00:00.000Z"),
        phone: "9833333333",
        service: "MCH",
        assignedUserId: fchvId ?? hfUserId,
        personIdentifier: {
          system: "urn:np:national-id",
          value: "NID-9801010003",
        },
      },
    ];

    const patientByCode = new Map<string, { id: string; personId: string }>();

    for (const p of patientSeedRows) {
      const [existingPatient] = await db
        .select({ id: patients.id, personId: patients.personId })
        .from(patients)
        .where(eq(patients.patientId, p.patientCode))
        .limit(1);

      let personId = existingPatient?.personId;
      if (!personId) {
        personId = (
          await db
            .insert(persons)
            .values({
              gender: p.gender,
              birthDate: p.birthDate,
              status: "active",
            })
            .returning({ id: persons.id })
        )[0].id;
      }

      const [name] = await db
        .select({ id: person_names.id })
        .from(person_names)
        .where(
          and(
            eq(person_names.personId, personId),
            eq(person_names.isPrimary, true),
          ),
        )
        .limit(1);
      if (!name) {
        await db.insert(person_names).values({
          personId,
          use: "official",
          family: p.lastName,
          given: p.firstName,
          isPrimary: true,
        });
      }

      const [contact] = await db
        .select({ id: person_contacts.id })
        .from(person_contacts)
        .where(
          and(
            eq(person_contacts.personId, personId),
            eq(person_contacts.system, "phone"),
            eq(person_contacts.isPrimary, true),
          ),
        )
        .limit(1);
      if (!contact) {
        await db.insert(person_contacts).values({
          personId,
          system: "phone",
          use: "mobile",
          value: p.phone,
          isPrimary: true,
        });
      }

      await db
        .insert(person_identifiers)
        .values({
          personId,
          system: p.personIdentifier.system,
          value: p.personIdentifier.value,
          use: "official",
          isPrimary: true,
        })
        .onConflictDoNothing();

      const [upsertedPatient] = await db
        .insert(patients)
        .values({
          personId,
          patientId: p.patientCode,
          service: p.service,
          facilityId,
          assignedUserId: p.assignedUserId,
          createdBy: adminId,
          updatedBy: adminId,
          status: "active",
        })
        .onConflictDoUpdate({
          target: patients.patientId,
          set: {
            service: p.service,
            facilityId,
            assignedUserId: p.assignedUserId,
            updatedBy: adminId,
            updatedAt: new Date(),
          },
        })
        .returning({ id: patients.id, personId: patients.personId });

      patientByCode.set(p.patientCode, upsertedPatient);

      await db
        .insert(patient_identifiers)
        .values({
          patientId: upsertedPatient.id,
          system: "urn:shg:patient-id",
          value: p.patientCode,
          use: "official",
          isPrimary: true,
        })
        .onConflictDoNothing();

      const [existingConsent] = await db
        .select({ id: consents.id })
        .from(consents)
        .where(
          and(
            eq(consents.patientId, upsertedPatient.id),
            eq(consents.purpose, "treatment"),
            eq(consents.scope, "facility"),
          ),
        )
        .limit(1);
      if (!existingConsent) {
        await db.insert(consents).values({
          patientId: upsertedPatient.id,
          personId: upsertedPatient.personId,
          purpose: "treatment",
          scope: "facility",
          status: "granted",
          grantedByUserId: adminId,
        });
      }
    }

    console.log("🌱 Seeding clinical visit + encounter dataset...");
    const primaryPatient = patientByCode.get("SHG-P-000001");
    const secondaryPatient = patientByCode.get("SHG-P-000002");
    const mchPatient = patientByCode.get("SHG-P-000003");
    if (!primaryPatient || !secondaryPatient || !mchPatient) {
      throw new Error("Missing seeded patients");
    }

    const visitDate = new Date("2026-04-10T09:30:00.000Z");
    const [existingVisit] = await db
      .select({ id: visits.id })
      .from(visits)
      .where(
        and(
          eq(visits.patientId, primaryPatient.id),
          eq(visits.reason, "Antenatal follow-up and vitals review"),
        ),
      )
      .limit(1);
    const visitId =
      existingVisit?.id ||
      (
        await db
          .insert(visits)
          .values({
            date: visitDate,
            reason: "Antenatal follow-up and vitals review",
            service: "ANC",
            status: "in_progress",
            patientId: primaryPatient.id,
            facilityId,
            doctorId,
          })
          .returning({ id: visits.id })
      )[0].id;

    const [existingEncounter] = await db
      .select({ id: encounters.id })
      .from(encounters)
      .where(
        and(
          eq(encounters.visitId, visitId),
          eq(encounters.encounterType, "outpatient"),
        ),
      )
      .limit(1);
    const encounterId =
      existingEncounter?.id ||
      (
        await db
          .insert(encounters)
          .values({
            encounterAt: visitDate,
            reason: "Routine follow-up review",
            service: "ANC",
            status: "in_progress",
            encounterType: "outpatient",
            patientId: primaryPatient.id,
            visitId,
            facilityId,
            doctorId,
            createdBy: doctorId,
            updatedBy: doctorId,
          })
          .returning({ id: encounters.id })
      )[0].id;

    const [existingVital] = await db
      .select({ id: vitals.id })
      .from(vitals)
      .where(eq(vitals.visitId, visitId))
      .limit(1);
    if (!existingVital) {
      await db.insert(vitals).values({
        systolic: 118,
        diastolic: 78,
        temperature: 36.7,
        pulse: 84,
        respiratoryRate: 18,
        spo2: 99,
        weight: 58.5,
        height: 159.4,
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingHistory] = await db
      .select({ id: histories.id })
      .from(histories)
      .where(eq(histories.visitId, visitId))
      .limit(1);
    if (!existingHistory) {
      await db.insert(histories).values({
        medical: "No chronic illness",
        surgical: "No prior surgeries",
        obGyn: "G2P1A0",
        medication: "Iron tablets",
        familyHistory: "No known hereditary conditions",
        social: "Non-smoker, non-alcoholic",
        other: "Followed by FCHV",
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingComplaint] = await db
      .select({ id: complaints.id })
      .from(complaints)
      .where(eq(complaints.visitId, visitId))
      .limit(1);
    if (!existingComplaint) {
      await db.insert(complaints).values({
        title: "Mild lower abdominal discomfort",
        duration: 3,
        durationUnit: "days",
        severity: "low",
        description: "Intermittent discomfort in evenings",
        patientId: primaryPatient.id,
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingProvisionalDiagnosis] = await db
      .select({ id: provisional_diagnoses.id })
      .from(provisional_diagnoses)
      .where(eq(provisional_diagnoses.visitId, visitId))
      .limit(1);
    if (!existingProvisionalDiagnosis) {
      await db.insert(provisional_diagnoses).values({
        description: "Normal pregnancy follow-up",
        patientId: primaryPatient.id,
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingConfirmedDiagnosis] = await db
      .select({ id: confirm_diagnoses.id })
      .from(confirm_diagnoses)
      .where(eq(confirm_diagnoses.visitId, visitId))
      .limit(1);
    if (!existingConfirmedDiagnosis) {
      await db.insert(confirm_diagnoses).values({
        icdCode: "JA00",
        description: "Routine antenatal supervision",
        patientId: primaryPatient.id,
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingTest] = await db
      .select({ id: tests.id })
      .from(tests)
      .where(eq(tests.visitId, visitId))
      .limit(1);
    if (!existingTest) {
      await db.insert(tests).values({
        testName: "Hemoglobin",
        testResult: "11.8 g/dL",
        testCategory: "lab",
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingTreatment] = await db
      .select({ id: treatments.id })
      .from(treatments)
      .where(eq(treatments.visitId, visitId))
      .limit(1);
    if (!existingTreatment) {
      await db.insert(treatments).values({
        medicalAdvise: "Continue ANC supplements and hydration",
        followUpText: "Return in 4 weeks",
        followUpDate: new Date("2026-05-08T09:30:00.000Z"),
        patientId: primaryPatient.id,
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    const [existingMedication] = await db
      .select({ id: medications.id })
      .from(medications)
      .where(eq(medications.visitId, visitId))
      .limit(1);
    if (!existingMedication) {
      await db.insert(medications).values({
        type: "tablet",
        medicineName: "Iron Folic Acid",
        dosage: "1 tablet",
        times: "OD",
        route: "oral",
        beforeAfter: "after-food",
        duration: "30 days",
        specialNotes: "Take with water",
        patientId: primaryPatient.id,
        visitId,
        encounterId,
        createdBy: doctorId,
      });
    }

    console.log("🌱 Seeding telehealth + roster data...");
    const appointmentDate = new Date("2026-04-16T08:00:00.000Z");
    const [existingAppointment] = await db
      .select({ id: appointments.id })
      .from(appointments)
      .where(
        and(
          eq(appointments.patientId, secondaryPatient.id),
          eq(appointments.doctorId, doctorId),
          eq(appointments.date, appointmentDate),
        ),
      )
      .limit(1);
    const appointmentId =
      existingAppointment?.id ||
      (
        await db
          .insert(appointments)
          .values({
            doctorId,
            patientId: secondaryPatient.id,
            facilityId,
            date: appointmentDate,
            status: "scheduled",
            service: "telehealth",
            createdBy: adminId,
          })
          .returning({ id: appointments.id })
      )[0].id;

    const [existingTelehealthSession] = await db
      .select({ id: telehealth_sessions.id })
      .from(telehealth_sessions)
      .where(eq(telehealth_sessions.appointmentId, appointmentId))
      .limit(1);
    if (!existingTelehealthSession) {
      await db.insert(telehealth_sessions).values({
        appointmentId,
        provider: "jitsi_jaas",
        roomName: `shg-${appointmentId}`,
      });
    }

    const rosterDate = "2026-04-16";
    const [existingRoster] = await db
      .select({ id: rosters.id })
      .from(rosters)
      .where(
        and(
          eq(rosters.userId, doctorId),
          eq(rosters.facilityId, facilityId),
          eq(rosters.date, rosterDate),
          eq(rosters.fromTime, "08:00"),
          eq(rosters.toTime, "12:00"),
          eq(rosters.service, "telehealth"),
        ),
      )
      .limit(1);
    if (!existingRoster) {
      await db.insert(rosters).values({
        userId: doctorId,
        facilityId,
        date: rosterDate,
        fromTime: "08:00",
        toTime: "12:00",
        service: "telehealth",
        status: "active",
        createdBy: adminId,
      });
    }

    console.log("🌱 Seeding family-planning, maternal and child health data...");
    const [existingPregnancy] = await db
      .select({ id: pregnancies.id })
      .from(pregnancies)
      .where(eq(pregnancies.patientId, primaryPatient.id))
      .limit(1);
    const pregnancyId =
      existingPregnancy?.id ||
      (
        await db
          .insert(pregnancies)
          .values({
            firstVisit: "2026-03-20",
            gravida: "2",
            para: "1",
            lastMenstruationPeriod: "2025-12-20",
            expectedDeliveryDate: "2026-09-25",
            patientId: primaryPatient.id,
            facilityId,
            assignedFchvId: fchvId,
          })
          .returning({ id: pregnancies.id })
      )[0].id;

    const [existingFamilyPlanning] = await db
      .select({ id: family_plannings.id })
      .from(family_plannings)
      .where(eq(family_plannings.patientId, mchPatient.id))
      .limit(1);
    if (!existingFamilyPlanning) {
      await db.insert(family_plannings).values({
        serviceDate: "2026-04-14",
        patientId: mchPatient.id,
        facilityId,
        serviceType: "follow_up",
        serviceProviderId: hfUserId,
        serviceProviderFirstName: "Nira",
        serviceProviderLastName: "Shrestha",
        createdBy: hfUserId,
        updatedBy: hfUserId,
      });
    }

    const [existingChildImmunization] = await db
      .select({ id: child_immunizations.id })
      .from(child_immunizations)
      .where(eq(child_immunizations.patientId, mchPatient.id))
      .limit(1);
    const childImmunizationId =
      existingChildImmunization?.id ||
      (
        await db
          .insert(child_immunizations)
          .values({
            mothersName: "Mina BK",
            fathersName: "Keshav BK",
            weightAtBirth: 2.9,
            patientId: mchPatient.id,
            facilityId,
          })
          .returning({ id: child_immunizations.id })
      )[0].id;

    const [existingImmunizationHistory] = await db
      .select({ id: immunization_histories.id })
      .from(immunization_histories)
      .where(
        and(
          eq(immunization_histories.patientId, mchPatient.id),
          eq(immunization_histories.vaccineName, "BCG"),
        ),
      )
      .limit(1);
    if (!existingImmunizationHistory) {
      await db.insert(immunization_histories).values({
        vaccineName: "BCG",
        date: new Date("2026-04-01T08:00:00.000Z"),
        vaccinated: 1,
        vaccinatedDate: new Date("2026-04-01T08:00:00.000Z"),
        patientId: mchPatient.id,
        childImmunizationId,
        createdBy: hfUserId,
      });
    }

    const [existingGrowth] = await db
      .select({ id: growths.id })
      .from(growths)
      .where(eq(growths.patientId, mchPatient.id))
      .limit(1);
    if (!existingGrowth) {
      await db.insert(growths).values({
        date: new Date("2026-04-12T08:30:00.000Z"),
        weight: 6.2,
        height: 62,
        muac: 13.4,
        patientId: mchPatient.id,
        childImmunizationId,
      });
    }

    console.log("🌱 Seeding sample attachments...");
    const [existingPatientAttachment] = await db
      .select({ id: attachments.id })
      .from(attachments)
      .where(
        and(
          eq(attachments.sourceType, "Patient"),
          eq(attachments.sourceId, primaryPatient.id),
          eq(attachments.name, "patient-consent.pdf"),
        ),
      )
      .limit(1);
    if (!existingPatientAttachment) {
      await db.insert(attachments).values({
        sourceType: "Patient",
        sourceId: primaryPatient.id,
        facilityId,
        name: "patient-consent.pdf",
        fileUrl: "seed/patient-consent.pdf",
        fileSize: 124000,
        fileType: "application/pdf",
        createdBy: adminId,
      });
    }

    const [existingEncounterAttachment] = await db
      .select({ id: attachments.id })
      .from(attachments)
      .where(
        and(
          eq(attachments.sourceType, "Encounter"),
          eq(attachments.sourceId, encounterId),
          eq(attachments.name, "cbc-report.pdf"),
        ),
      )
      .limit(1);
    if (!existingEncounterAttachment) {
      await db.insert(attachments).values({
        sourceType: "Encounter",
        sourceId: encounterId,
        facilityId,
        name: "cbc-report.pdf",
        fileUrl: "seed/cbc-report.pdf",
        fileSize: 76000,
        fileType: "application/pdf",
        createdBy: doctorId,
      });
    }

    console.log("✅ Frontend integration demo dataset seeded");
    console.log("✨ Seeding completed!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
