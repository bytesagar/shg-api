import "dotenv/config";
import { readFileSync } from "fs";
import path, { join } from "path";
import { db } from "./index";
import {
  appointments,
  attachments,
  child_immunizations,
  complaints,
  confirm_diagnoses,
  consents,
  districts,
  encounters,
  family_plannings,
  growths,
  health_facilities,
  histories,
  icd11_codes,
  immunization_histories,
  vaccines,
  vaccine_doses,
  medications,
  municipalities,
  patient_identifiers,
  patients,
  person_contacts,
  person_identifiers,
  person_names,
  persons,
  pregnancies,
  provinces,
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
import { distance } from "fastest-levenshtein";
import { seedImnciBookletStub } from "./seeds/imnci/seed-imnci";

const DEFAULT_USER_ROLES: { name: string; description: string }[] = [
  { name: "admin", description: "Administrator" },
  { name: "doctor", description: "Doctor" },
  { name: "hfuser", description: "Health Facility User" },
  { name: "fchvuser", description: "FCHV User" },
  { name: "municipalityuser", description: "Municipality User" },
  { name: "palika", description: "palika user" },
];

const PROVINCE_ALIASES: Record<string, string> = {
  sudurpashchim: "sudurpashchim",
  sudurpaschim: "sudurpashchim",
  sudurpashchimpradesh: "sudurpashchim",
  sudurpaschimpradesh: "sudurpashchim",
  sudurpashchimprovince: "sudurpashchim",
  sudurpaschimprovince: "sudurpashchim",
  karnali: "karnali",
  karnalipradesh: "karnali",
  karnaliprovince: "karnali",
  lumbini: "lumbini",
  lumbinipradesh: "lumbini",
  lumbiniprovince: "lumbini",
  gandaki: "gandaki",
  gandakipradesh: "gandaki",
  gandakiprovince: "gandaki",
  bagmati: "bagmati",
  bagamatipradesh: "bagmati",
  bagmatipradesh: "bagmati",
  bagmatiprovince: "bagmati",
  bagamatiprovince: "bagmati",
  madhesh: "madhesh",
  madheshpradesh: "madhesh",
  madheshprovince: "madhesh",
  koshi: "koshi",
  koshipradesh: "koshi",
  koshiprovince: "koshi",
  provincemumber1: "koshi",
  provinceno2: "madhesh",
  provinceno3: "bagmati",
  provinceno7: "sudurpashchim",
  provinceno4: "gandaki",
  provinceno5: "lumbini",
  provinceno6: "karnali",
};

function normalizeGeoName(input: unknown): string {
  const stripped = String(input ?? "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(
      /\b(rural municipality|urban municipality|municipality|metropolitan city|sub-metropolitan city|metropolitan|sub-metropolitan|province|pradesh|pradesha|state|district)\b/gi,
      " ",
    )
    .replace(
      /(गाउँपालिका|नगरपालिका|महानगरपालिका|उपमहानगरपालिका|प्रदेश|जिल्ला)/g,
      " ",
    )
    .replace(/[^a-z0-9\u0900-\u097f]+/g, "")
    .trim();

  return PROVINCE_ALIASES[stripped] ?? stripped;
}

function fuzzyMatchMap(
  query: string,
  candidates: Map<string, number>,
  threshold = 3,
): { code: number; key: string } | null {
  if (!query || candidates.size === 0) return null;

  let bestCode: number | null = null;
  let bestKey: string | null = null;
  let bestDistance = Infinity;

  for (const [key, code] of candidates) {
    const d = distance(query, key);
    if (d < bestDistance) {
      bestDistance = d;
      bestCode = code;
      bestKey = key;
    }
  }

  if (bestDistance <= threshold && bestCode !== null && bestKey !== null) {
    return { code: bestCode, key: bestKey };
  }
  return null;
}

function parseProvinceCode(
  input: unknown,
  provinceNameToCode: Map<string, number>,
): number | null {
  const raw = String(input ?? "").trim();
  const m = raw.match(/^(\d+)$/);
  if (m) {
    const n = Number(m[1]);
    return Number.isFinite(n) ? n : null;
  }
  const key = normalizeGeoName(raw);
  if (provinceNameToCode.has(key)) return provinceNameToCode.get(key)!;

  const fuzzy = fuzzyMatchMap(key, provinceNameToCode, 2);
  if (fuzzy) return fuzzy.code;
  return null;
}

function readDataJson<T>(relativePath: string): T | null {
  const filePath = path.join(process.cwd(), "data", relativePath);
  const raw = readFileSync(filePath, "utf-8");
  if (!raw.trim()) return null;
  return JSON.parse(raw) as T;
}

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

  const parsed = readDataJson<{
    metadata: { source: string; generated: string };
    codes: { code: string; title: string; category: string }[];
  }>("icd11-nepal-common.json");


  if (parsed?.metadata?.source) {
    console.log(
      `  ↳ ICD-11 metadata: source=${parsed.metadata.source}, generated=${parsed.metadata?.generated ?? "n/a"}`,
    );
  }

  const rows =
    parsed!.codes?.map((c) => ({
      code: c.code,
      title: c.title,
      category: c.category,
    })) ?? [];

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

async function seedGeography() {
  console.log("🌱 Seeding provinces/districts/municipalities...");

  const provincesJson = readDataJson<{
    provinces: { code: number; name: { en: string; np: string } }[];
  }>("provinces.json");
  const districtsJson = readDataJson<{
    districts: {
      code: number;
      province_code: number;
      name: { en: string; np: string };
    }[];
  }>("districts.json");
  const municipalitiesJson = readDataJson<
    | {
        municipalities: {
          code: number;
          district_code: number;
          name: { en: string; np: string };
          no_of_wards: number;
        }[];
      }
    | {
        muncipalities: {
          code: number;
          district_code: number;
          name: { en: string; np: string };
          no_of_wards: number;
        }[];
      }
  >("muncipalities.json");

  const provinceItems = provincesJson?.provinces ?? [];
  if (provinceItems.length) {
    const byCode = new Map<
      number,
      { code: number; name: { en: string; np: string } }
    >();
    for (const p of provinceItems) byCode.set(p.code, p);

    const tuples = [...byCode.values()].map(
      (p) => sql`(${p.code}::int, ${JSON.stringify(p.name)}::jsonb)`,
    );

    await db.execute(sql`
      insert into provinces (code, name, created_at, updated_at)
      select v.code, v.name, now(), now()
      from (values ${sql.join(tuples, sql`,`)}) as v(code, name)
      where not exists (select 1 from provinces p where p.code = v.code)
    `);

    await db.execute(sql`
      update provinces p
      set name = v.name,
          updated_at = now()
      from (values ${sql.join(tuples, sql`,`)}) as v(code, name)
      where p.code = v.code
    `);
  }

  const districtItems = districtsJson?.districts ?? [];
  if (districtItems.length) {
    const byCode = new Map<
      number,
      { code: number; province_code: number; name: { en: string; np: string } }
    >();
    for (const d of districtItems) byCode.set(d.code, d);

    const tuples = [...byCode.values()].map(
      (d) =>
        sql`(${d.code}::int, ${d.province_code}::int, ${JSON.stringify(d.name)}::jsonb)`,
    );

    await db.execute(sql`
      insert into districts (code, province_id, name, created_at, updated_at)
      select v.code, p.id, v.name, now(), now()
      from (values ${sql.join(tuples, sql`,`)}) as v(code, province_code, name)
      join provinces p on p.code = v.province_code
      where not exists (select 1 from districts d where d.code = v.code)
    `);

    await db.execute(sql`
      update districts d
      set province_id = p.id,
          name = v.name,
          updated_at = now()
      from (values ${sql.join(tuples, sql`,`)}) as v(code, province_code, name)
      join provinces p on p.code = v.province_code
      where d.code = v.code
    `);
  }

  const municipalityItemsRaw: any[] =
    (municipalitiesJson && "municipalities" in municipalitiesJson
      ? municipalitiesJson.municipalities
      : municipalitiesJson && "muncipalities" in municipalitiesJson
        ? municipalitiesJson.muncipalities
        : []) ?? [];

  if (municipalityItemsRaw.length) {
    const toFiniteNumber = (v: unknown): number | null => {
      const n =
        typeof v === "string" && v.trim()
          ? Number(v)
          : typeof v === "number"
            ? v
            : Number(v);
      return Number.isFinite(n) ? n : null;
    };

    const normalized = municipalityItemsRaw
      .map((m) => {
        const code = toFiniteNumber(m.code);
        const districtCode = toFiniteNumber(
          m.district_code ?? m.districtCode ?? m.district ?? m.district_id,
        );
        const wards =
          toFiniteNumber(
            m.no_of_wards ?? m.noOfWards ?? m.no_of_ward ?? m.wards,
          ) ?? 0;

        return {
          code,
          district_code: districtCode,
          name: m.name,
          no_of_wards: wards,
        };
      })
      .filter(
        (
          m,
        ): m is {
          code: number;
          district_code: number;
          name: any;
          no_of_wards: number;
        } => m.code != null && m.district_code != null,
      );

    const byCode = new Map<number, (typeof normalized)[number]>();
    for (const m of normalized) byCode.set(m.code, m);

    const tuples = [...byCode.values()].map(
      (m) =>
        sql`(${m.code}::int, ${m.district_code}::int, ${JSON.stringify(m.name)}::jsonb, ${m.no_of_wards}::int)`,
    );

    if (tuples.length) {
      await db.execute(sql`
        insert into municipalities (code, district_id, name, no_of_wards, created_at, updated_at)
        select v.code, d.id, v.name, v.no_of_wards, now(), now()
        from (values ${sql.join(tuples, sql`,`)}) as v(code, district_code, name, no_of_wards)
        join districts d on d.code = v.district_code
        where not exists (select 1 from municipalities m where m.code = v.code)
      `);

      await db.execute(sql`
        update municipalities m
        set district_id = d.id,
            name = v.name,
            no_of_wards = v.no_of_wards,
            updated_at = now()
        from (values ${sql.join(tuples, sql`,`)}) as v(code, district_code, name, no_of_wards)
        join districts d on d.code = v.district_code
        where m.code = v.code
      `);
    }
  }

  console.log("✅ Geography seeded");
}

async function seedHealthFacilitiesFromJson() {
  console.log("🌱 Seeding health facilities from JSON...");

  const facilitiesJson = readDataJson<any[]>("health-facilities.json") ?? [];
  const provincesJson = readDataJson<{
    provinces: { code: number; name: { en: string; np: string } }[];
  }>("provinces.json");
  const districtsJson = readDataJson<{
    districts: {
      code: number;
      province_code: number;
      name: { en: string; np: string };
    }[];
  }>("districts.json");
  const municipalitiesJson = readDataJson<{ municipalities: any[] }>(
    "muncipalities.json",
  );

  const provinceNameToCode = new Map<string, number>();
  for (const p of provincesJson?.provinces ?? []) {
    const enNorm = normalizeGeoName(p.name.en);
    const npNorm = normalizeGeoName(p.name.np);
    provinceNameToCode.set(enNorm, p.code);
    provinceNameToCode.set(npNorm, p.code);
    const enBase = normalizeGeoName(
      p.name.en.replace(/province/i, "").replace(/pradesh/i, ""),
    );
    if (enBase) provinceNameToCode.set(enBase, p.code);
  }

  console.log("  ↳ Province map keys:", [...provinceNameToCode.keys()]);

  const districtNameToCode = new Map<string, number>();
  for (const d of districtsJson?.districts ?? []) {
    districtNameToCode.set(normalizeGeoName(d.name.en), d.code);
    districtNameToCode.set(normalizeGeoName(d.name.np), d.code);
  }

  const municipalityByDistrict = new Map<number, Map<string, number>>();
  for (const m of municipalitiesJson?.municipalities ?? []) {
    const districtCode = Number(m.district_code);
    const code = Number(m.code);
    if (!Number.isFinite(districtCode) || !Number.isFinite(code)) continue;

    const en = normalizeGeoName(m.name?.en);
    const np = normalizeGeoName(m.name?.np);
    const enBase = normalizeGeoName(
      String(m.name?.en ?? "").replace(
        /\b(rural municipality|urban municipality|municipality|metropolitan city|sub-metropolitan city)\b/gi,
        "",
      ),
    );

    const map =
      municipalityByDistrict.get(districtCode) ?? new Map<string, number>();
    if (en) map.set(en, code);
    if (np) map.set(np, code);
    if (enBase && enBase !== en) map.set(enBase, code);
    municipalityByDistrict.set(districtCode, map);
  }

  const byHfCode = new Map<
    string,
    {
      hfCode: string;
      name: string;
      address: string;
      phone: string;
      email: string;
      ward: string;
      palika: string;
      district: string;
      province: string;
      inchargeName: string;
      provinceCode: number | null;
      districtCode: number | null;
      municipalityCode: number | null;
    }
  >();

  let fuzzyMatchCount = 0;
  let unresolved = 0;

  console.log(`  ↳ ${facilitiesJson.length} health facilities to process`);

  for (const f of facilitiesJson) {
    const hfCode = String(f?.hfCode ?? f?.hf_code ?? "").trim();
    const name = String(f?.name ?? "").trim();
    if (!hfCode || !name) continue;

    const province = String(f?.province ?? "").trim();
    const district = String(f?.district ?? "").trim();
    const palika = String(f?.palika ?? "").trim();

    const provinceNorm = normalizeGeoName(province);
    let provinceCode = provinceNameToCode.get(provinceNorm) ?? null;
    if (provinceCode === null) {
      const fuzzy = fuzzyMatchMap(provinceNorm, provinceNameToCode, 2);
      if (fuzzy) {
        console.log(
          `  ~ fuzzy province: "${province}" → "${fuzzy.key}" (code ${fuzzy.code})`,
        );
        provinceCode = fuzzy.code;
        fuzzyMatchCount++;
      }
    }

    const districtNorm = normalizeGeoName(district);
    let districtCode = districtNameToCode.get(districtNorm) ?? null;
    if (districtCode === null) {
      const fuzzy = fuzzyMatchMap(districtNorm, districtNameToCode, 2);
      if (fuzzy) {
        console.log(
          `  ~ fuzzy district: "${district}" → "${fuzzy.key}" (code ${fuzzy.code})`,
        );
        districtCode = fuzzy.code;
        fuzzyMatchCount++;
      }
    }

    const palikaKey = normalizeGeoName(palika);
    const districtMunicipalities =
      districtCode != null ? municipalityByDistrict.get(districtCode) : null;

    let municipalityCode = districtMunicipalities?.get(palikaKey) ?? null;
    if (municipalityCode === null && districtMunicipalities) {
      const fuzzy = fuzzyMatchMap(palikaKey, districtMunicipalities, 3);
      if (fuzzy) {
        console.log(
          `  ~ fuzzy palika:   "${palika}" → "${fuzzy.key}" (code ${fuzzy.code})`,
        );
        municipalityCode = fuzzy.code;
        fuzzyMatchCount++;
      }
    }

    if (!provinceCode || !districtCode || !municipalityCode) {
      unresolved++;
      console.warn(`  ⚠️  [${hfCode}] ${name}`);
      if (!provinceCode)
        console.warn(
          `       province not found: "${province}" → "${provinceNorm}"`,
        );
      if (!districtCode)
        console.warn(
          `       district not found: "${district}" → "${districtNorm}"`,
        );
      if (districtCode && !municipalityCode) {
        console.warn(
          `       palika not found:   "${palika}" → "${palikaKey}" in district ${districtCode}`,
        );
        const available = [...(districtMunicipalities?.keys() ?? [])].slice(
          0,
          8,
        );
        console.warn(`       available keys: ${available.join(", ")}`);
      }
    }

    byHfCode.set(hfCode, {
      hfCode,
      name,
      address: String(f?.address ?? "").trim(),
      phone: String(f?.phone ?? "").trim(),
      email: String(f?.email ?? "").trim(),
      ward: String(f?.ward ?? "").trim(),
      palika,
      district,
      province,
      inchargeName: String(f?.inchargeName ?? "").trim(),
      provinceCode,
      districtCode,
      municipalityCode,
    });
  }

  console.log(
    `  ↳ Fuzzy matches applied: ${fuzzyMatchCount}, Unresolved: ${unresolved}`,
  );

  const rows = [...byHfCode.values()];
  if (!rows.length) {
    console.log("✅ Health facilities JSON has no seedable rows");
    return;
  }

  const payload = JSON.stringify(
    rows.map((r) => ({
      hf_code: r.hfCode,
      name: r.name,
      address: r.address,
      phone: r.phone,
      email: r.email,
      ward: r.ward,
      palika: r.palika,
      district: r.district,
      province: r.province,
      incharge_name: r.inchargeName,
      province_code: r.provinceCode,
      district_code: r.districtCode,
      municipality_code: r.municipalityCode,
    })),
  );

  await db.execute(sql`
    with v as (
      select *
      from jsonb_to_recordset(${payload}::jsonb) as v(
        hf_code text,
        name text,
        address text,
        phone text,
        email text,
        ward text,
        palika text,
        district text,
        province text,
        incharge_name text,
        province_code int,
        district_code int,
        municipality_code int
      )
    )
    insert into health_facilities (
      name, address, phone, email, ward, palika, district, province,
      province_id, district_id, municipality_id, incharge_name, hf_code,
      created_at, updated_at
    )
    select
      v.name, v.address, v.phone, v.email, v.ward, v.palika, v.district, v.province,
      p.id, d.id, m.id, v.incharge_name, v.hf_code, now(), now()
    from v
    left join provinces p on p.code = v.province_code
    left join districts d on d.code = v.district_code
    left join municipalities m on m.code = v.municipality_code
    where not exists (
      select 1 from health_facilities hf where hf.hf_code = v.hf_code
    )
  `);

  await db.execute(sql`
    with v as (
      select *
      from jsonb_to_recordset(${payload}::jsonb) as v(
        hf_code text,
        name text,
        address text,
        phone text,
        email text,
        ward text,
        palika text,
        district text,
        province text,
        incharge_name text,
        province_code int,
        district_code int,
        municipality_code int
      )
    )
    update health_facilities hf
    set
      name = v.name, address = v.address, phone = v.phone, email = v.email,
      ward = v.ward, palika = v.palika, district = v.district, province = v.province,
      province_id = p.id, district_id = d.id, municipality_id = m.id,
      incharge_name = v.incharge_name, updated_at = now()
    from v
    left join provinces p on p.code = v.province_code
    left join districts d on d.code = v.district_code
    left join municipalities m on m.code = v.municipality_code
    where hf.hf_code = v.hf_code
  `);

  console.log(`✅ Health facilities seeded (${rows.length} rows)`);
}

/**
 * Nepal HMIS 2082 EPI catalog. Seeds the immunization schedule plus the
 * non-vaccine preventive interventions (Vitamin A, deworming, BAAL VITA)
 * that share the same per-visit record shape. Idempotent — keyed on
 * `vaccines.code` and `(vaccine_code, dose_number)`.
 */
async function seedVaccineCatalog() {
  console.log("🌱 Seeding vaccine catalog (HMIS 2082)...");

  type DoseSpec = {
    doseNumber: number;
    en: string;
    np: string;
    targetAgeMinDays?: number;
    targetAgeMaxDays?: number;
    milestone?: string;
  };

  type VaccineSpec = {
    code: string;
    en: string;
    np: string;
    totalDoses: number;
    defaultRoute?:
      | "im"
      | "sc"
      | "id"
      | "po"
      | "nasal"
      | "other";
    defaultSite?:
      | "left_arm"
      | "right_arm"
      | "left_thigh"
      | "right_thigh"
      | "oral"
      | "other";
    category: "vaccine" | "nutrition";
    isHpv?: boolean;
    displayOrder: number;
    doses: DoseSpec[];
  };

  const catalog: VaccineSpec[] = [
    {
      code: "BCG",
      en: "BCG",
      np: "बी.सी.जी.",
      totalDoses: 1,
      defaultRoute: "id",
      defaultSite: "left_arm",
      category: "vaccine",
      displayOrder: 1,
      doses: [
        {
          doseNumber: 1,
          en: "BCG",
          np: "बी.सी.जी.",
          targetAgeMinDays: 0,
          targetAgeMaxDays: 14,
          milestone: "at_birth",
        },
      ],
    },
    {
      code: "ROTA",
      en: "Rotavirus",
      np: "रोटा",
      totalDoses: 2,
      defaultRoute: "po",
      defaultSite: "oral",
      category: "vaccine",
      displayOrder: 2,
      doses: [
        {
          doseNumber: 1,
          en: "Rota 1",
          np: "रोटा १",
          targetAgeMinDays: 42,
          targetAgeMaxDays: 56,
          milestone: "week_6",
        },
        {
          doseNumber: 2,
          en: "Rota 2",
          np: "रोटा २",
          targetAgeMinDays: 70,
          targetAgeMaxDays: 84,
          milestone: "week_10",
        },
      ],
    },
    {
      code: "OPV",
      en: "OPV (bOPV)",
      np: "ओ.पी.भी.",
      totalDoses: 3,
      defaultRoute: "po",
      defaultSite: "oral",
      category: "vaccine",
      displayOrder: 3,
      doses: [
        {
          doseNumber: 1,
          en: "OPV 1",
          np: "ओ.पी.भी. १",
          targetAgeMinDays: 42,
          targetAgeMaxDays: 56,
          milestone: "week_6",
        },
        {
          doseNumber: 2,
          en: "OPV 2",
          np: "ओ.पी.भी. २",
          targetAgeMinDays: 70,
          targetAgeMaxDays: 84,
          milestone: "week_10",
        },
        {
          doseNumber: 3,
          en: "OPV 3",
          np: "ओ.पी.भी. ३",
          targetAgeMinDays: 98,
          targetAgeMaxDays: 112,
          milestone: "week_14",
        },
      ],
    },
    {
      code: "PCV",
      en: "PCV",
      np: "पी.सी.भी.",
      totalDoses: 3,
      defaultRoute: "im",
      defaultSite: "right_thigh",
      category: "vaccine",
      displayOrder: 4,
      doses: [
        {
          doseNumber: 1,
          en: "PCV 1",
          np: "पी.सी.भी. १",
          targetAgeMinDays: 42,
          targetAgeMaxDays: 56,
          milestone: "week_6",
        },
        {
          doseNumber: 2,
          en: "PCV 2",
          np: "पी.सी.भी. २",
          targetAgeMinDays: 70,
          targetAgeMaxDays: 84,
          milestone: "week_10",
        },
        {
          doseNumber: 3,
          en: "PCV 3",
          np: "पी.सी.भी. ३",
          targetAgeMinDays: 273,
          targetAgeMaxDays: 305,
          milestone: "month_9",
        },
      ],
    },
    {
      code: "PENTA",
      en: "Pentavalent (DPT-HepB-Hib)",
      np: "डी.पी.टी.-हेप बी-हिब",
      totalDoses: 3,
      defaultRoute: "im",
      defaultSite: "left_thigh",
      category: "vaccine",
      displayOrder: 5,
      doses: [
        {
          doseNumber: 1,
          en: "Penta 1",
          np: "पेन्टा १",
          targetAgeMinDays: 42,
          targetAgeMaxDays: 56,
          milestone: "week_6",
        },
        {
          doseNumber: 2,
          en: "Penta 2",
          np: "पेन्टा २",
          targetAgeMinDays: 70,
          targetAgeMaxDays: 84,
          milestone: "week_10",
        },
        {
          doseNumber: 3,
          en: "Penta 3",
          np: "पेन्टा ३",
          targetAgeMinDays: 98,
          targetAgeMaxDays: 112,
          milestone: "week_14",
        },
      ],
    },
    {
      code: "FIPV",
      en: "fIPV",
      np: "एफ.आई.पी.भी.",
      totalDoses: 2,
      defaultRoute: "id",
      defaultSite: "right_arm",
      category: "vaccine",
      displayOrder: 6,
      doses: [
        {
          doseNumber: 1,
          en: "fIPV 1",
          np: "एफ.आई.पी.भी. १",
          targetAgeMinDays: 98,
          targetAgeMaxDays: 112,
          milestone: "week_14",
        },
        {
          doseNumber: 2,
          en: "fIPV 2",
          np: "एफ.आई.पी.भी. २",
          targetAgeMinDays: 273,
          targetAgeMaxDays: 305,
          milestone: "month_9",
        },
      ],
    },
    {
      code: "MR",
      en: "Measles-Rubella",
      np: "दादुरा-रुबेला",
      totalDoses: 2,
      defaultRoute: "sc",
      defaultSite: "right_arm",
      category: "vaccine",
      displayOrder: 7,
      doses: [
        {
          doseNumber: 1,
          en: "MR 1",
          np: "दादुरा-रुबेला १",
          targetAgeMinDays: 273,
          targetAgeMaxDays: 365,
          milestone: "month_9",
        },
        {
          doseNumber: 2,
          en: "MR 2",
          np: "दादुरा-रुबेला २",
          targetAgeMinDays: 455,
          targetAgeMaxDays: 700,
          milestone: "month_15",
        },
      ],
    },
    {
      code: "JE",
      en: "Japanese Encephalitis",
      np: "जापानी इन्सेफलाइटिस",
      totalDoses: 1,
      defaultRoute: "sc",
      defaultSite: "left_arm",
      category: "vaccine",
      displayOrder: 8,
      doses: [
        {
          doseNumber: 1,
          en: "JE",
          np: "जे.ई.",
          targetAgeMinDays: 365,
          targetAgeMaxDays: 455,
          milestone: "month_12",
        },
      ],
    },
    {
      code: "TCV",
      en: "Typhoid (TCV)",
      np: "टाइफाइड (टी.सी.भी.)",
      totalDoses: 1,
      defaultRoute: "im",
      defaultSite: "left_arm",
      category: "vaccine",
      displayOrder: 9,
      doses: [
        {
          doseNumber: 1,
          en: "TCV",
          np: "टी.सी.भी.",
          targetAgeMinDays: 455,
          targetAgeMaxDays: 700,
          milestone: "month_15",
        },
      ],
    },
    {
      code: "HPV",
      en: "HPV",
      np: "एच.पी.भी.",
      totalDoses: 2,
      defaultRoute: "im",
      defaultSite: "left_arm",
      category: "vaccine",
      isHpv: true,
      displayOrder: 10,
      doses: [
        {
          doseNumber: 1,
          en: "HPV 1",
          np: "एच.पी.भी. १",
          milestone: "school",
        },
        {
          doseNumber: 2,
          en: "HPV 2",
          np: "एच.पी.भी. २",
          milestone: "school",
        },
      ],
    },
    {
      code: "TD",
      en: "Tetanus-Diphtheria (TD)",
      np: "टी.डी.",
      totalDoses: 3,
      defaultRoute: "im",
      defaultSite: "left_arm",
      category: "vaccine",
      displayOrder: 11,
      doses: [
        { doseNumber: 1, en: "TD 1", np: "टी.डी. १" },
        { doseNumber: 2, en: "TD 2", np: "टी.डी. २" },
        { doseNumber: 3, en: "TD 2+", np: "टी.डी. २+" },
      ],
    },
    {
      code: "VITA_A",
      en: "Vitamin A",
      np: "भिटामिन ए",
      totalDoses: 10,
      category: "nutrition",
      displayOrder: 12,
      doses: Array.from({ length: 10 }, (_, i) => ({
        doseNumber: i + 1,
        en: `Vitamin A round ${i + 1}`,
        np: `भिटामिन ए राउण्ड ${i + 1}`,
      })),
    },
    {
      code: "DEWORM",
      en: "Deworming (Albendazole)",
      np: "जुकाको औषधी (अल्बेन्डाजोल)",
      totalDoses: 10,
      category: "nutrition",
      displayOrder: 13,
      doses: Array.from({ length: 10 }, (_, i) => ({
        doseNumber: i + 1,
        en: `Deworming round ${i + 1}`,
        np: `जुका राउण्ड ${i + 1}`,
      })),
    },
    {
      code: "BAALVITA",
      en: "BAAL VITA (MNP)",
      np: "बालविटा",
      totalDoses: 3,
      category: "nutrition",
      displayOrder: 14,
      doses: [
        {
          doseNumber: 1,
          en: "BAAL VITA round 1 (6-11 mo)",
          np: "बालविटा १",
        },
        {
          doseNumber: 2,
          en: "BAAL VITA round 2 (12-17 mo)",
          np: "बालविटा २",
        },
        {
          doseNumber: 3,
          en: "BAAL VITA round 3 (18-23 mo)",
          np: "बालविटा ३",
        },
      ],
    },
  ];

  for (const spec of catalog) {
    const existing = await db
      .select({ code: vaccines.code })
      .from(vaccines)
      .where(eq(vaccines.code, spec.code))
      .limit(1);
    if (existing.length === 0) {
      await db.insert(vaccines).values({
        code: spec.code,
        label: { en: spec.en, np: spec.np },
        totalDoses: spec.totalDoses,
        defaultRoute: spec.defaultRoute ?? null,
        defaultSite: spec.defaultSite ?? null,
        category: spec.category,
        isHpv: spec.isHpv ?? false,
        displayOrder: spec.displayOrder,
      });
    }

    for (const dose of spec.doses) {
      const existingDose = await db
        .select({ id: vaccine_doses.id })
        .from(vaccine_doses)
        .where(
          and(
            eq(vaccine_doses.vaccineCode, spec.code),
            eq(vaccine_doses.doseNumber, dose.doseNumber),
          ),
        )
        .limit(1);
      if (existingDose.length === 0) {
        await db.insert(vaccine_doses).values({
          vaccineCode: spec.code,
          doseNumber: dose.doseNumber,
          label: { en: dose.en, np: dose.np },
          targetAgeMinDays: dose.targetAgeMinDays ?? null,
          targetAgeMaxDays: dose.targetAgeMaxDays ?? null,
          milestone: dose.milestone ?? null,
          displayOrder: dose.doseNumber,
        });
      }
    }
  }

  console.log(`✅ Vaccine catalog seeded (${catalog.length} vaccines).`);
}

async function seed() {
  await seedUserRoles();
  await seedIcd11Codes();
  await seedGeography();
  await seedHealthFacilitiesFromJson();
  await seedImnciBookletStub();
  await seedVaccineCatalog();

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
          designation: (u as any).designation,
          specialization: (u as any).specialization,
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

      console.log(`  ↳ User ${u.username} seeded/updated`);
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

    const visitDate = "2026-04-10";
    const visitEncounterAt = new Date("2026-04-10T09:30:00.000Z");
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
            encounterAt: visitEncounterAt,
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
    const appointmentDate = "2026-04-16";
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
      const fpVisitDate = "2026-04-14";
      const fpEncounterAt = new Date("2026-04-14T10:00:00.000Z");

      const [existingFpVisit] = await db
        .select({ id: visits.id })
        .from(visits)
        .where(
          and(
            eq(visits.patientId, mchPatient.id),
            eq(visits.facilityId, facilityId),
            eq(visits.date, fpVisitDate),
            eq(visits.reason, "Family planning follow-up"),
          ),
        )
        .limit(1);

      const fpVisitId =
        existingFpVisit?.id ||
        (
          await db
            .insert(visits)
            .values({
              date: fpVisitDate,
              reason: "Family planning follow-up",
              service: "FP",
              status: "in_progress",
              patientId: mchPatient.id,
              facilityId,
              doctorId: hfUserId,
            })
            .returning({ id: visits.id })
        )[0].id;

      const [existingFpEncounter] = await db
        .select({ id: encounters.id })
        .from(encounters)
        .where(
          and(
            eq(encounters.visitId, fpVisitId),
            eq(encounters.encounterType, "outpatient"),
          ),
        )
        .limit(1);

      const fpEncounterId =
        existingFpEncounter?.id ||
        (
          await db
            .insert(encounters)
            .values({
              encounterAt: fpEncounterAt,
              reason: "Family planning follow-up",
              service: "FP",
              status: "in_progress",
              encounterType: "outpatient",
              patientId: mchPatient.id,
              visitId: fpVisitId,
              facilityId,
              doctorId: hfUserId,
              createdBy: hfUserId,
              updatedBy: hfUserId,
            })
            .returning({ id: encounters.id })
        )[0].id;

      await db.insert(family_plannings).values({
        serviceDate: "2026-04-14",
        visitId: fpVisitId,
        encounterId: fpEncounterId,
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
        facilityId,
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