import "dotenv/config";
import { db } from "./index";
import { users, health_facilities } from "./schema";
import * as bcrypt from "bcryptjs";

async function seed() {
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

  const facilityResult = await db
    .insert(health_facilities)
    .values(facilityData)
    .onConflictDoNothing()
    .returning();

  const facilityId =
    facilityResult[0]?.id ||
    (await db.select().from(health_facilities).limit(1))[0].id;

  console.log(`✅ Facility ${facilityData.name} seeded`);

  console.log("🌱 Seeding users...");

  const hashedPassword = await bcrypt.hash("password123", 10);

  const usersData = [
    {
      email: "admin@shg.com",
      username: "admin",
      firstName: "Admin",
      lastName: "User",
      password: hashedPassword,
      userType: "admin" as const,
      phoneNumber: "9800000000",
      facilityId,
    },
    {
      email: "user@shg.com",
      username: "user",
      firstName: "Regular",
      lastName: "User",
      password: hashedPassword,
      userType: "user" as const,
      phoneNumber: "9800000001",
      facilityId,
    },
    {
      email: "facility@shg.com",
      username: "facility",
      firstName: "Facility",
      lastName: "User",
      password: hashedPassword,
      userType: "facility" as const,
      phoneNumber: "9800000002",
      facilityId,
    },
  ];

  try {
    for (const u of usersData) {
      await db
        .insert(users)
        .values(u)
        .onConflictDoUpdate({
          target: users.email,
          set: { facilityId: u.facilityId },
        });
      console.log(`✅ User ${u.username} seeded/updated`);
    }
    console.log("✨ Seeding completed!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    process.exit(0);
  }
}

seed();
