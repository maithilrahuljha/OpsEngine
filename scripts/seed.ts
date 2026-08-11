import "dotenv/config";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import {
  users,
  cadets,
  vivaScores,
  cbtScores,
  disciplinaryLogs,
  medicalAudits,
  rollCalls,
  leads,
  leadActivities,
} from "../src/db/schema";
import { createHash } from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const db = drizzle(pool);

function hashPassword(password: string): string {
  return createHash("sha256").update(`paramount::${password}`).digest("hex");
}

const PASSWORD = hashPassword("paramount123");

const CADET_NAMES = [
  "Aarav Sharma", "Vihaan Reddy", "Aditya Kulkarni", "Rohan Mishra", "Kabir Singh Rathore",
  "Arjun Nair", "Ishaan Chatterjee", "Devansh Tiwari", "Pranav Iyer", "Yash Raj Chauhan",
  "Siddharth Menon", "Harsh Vardhan Yadav", "Nikhil Deshmukh", "Aryan Gupta", "Rudra Pratap Singh",
  "Manav Joshi", "Krishna Pillai", "Tanmay Bhosale", "Shaurya Tomar", "Ansh Agrawal",
  "Vedant Kapoor", "Om Prakash Dubey", "Lakshya Bansal", "Ritvik Saxena", "Dhruv Malhotra",
];

const BATCHES = ["ECHO", "VICTOR", "ELITE"] as const;
const STREAMS = ["DNS_OFFICER", "BSC_NAUTICAL", "BTECH_MARINE", "GP_RATING"] as const;
const CAMPUSES = ["Gwalior HQ", "Gwalior HQ", "Patna Spoke", "Dehradun Spoke"];
const COMPANIES = ["Anglo-Eastern", "Synergy", "Fleet Management", "GEIMS"];

// deterministic pseudo-random
let seedVal = 42;
function rand() {
  seedVal = (seedVal * 1103515245 + 12345) % 2147483648;
  return seedVal / 2147483648;
}
function between(min: number, max: number, dp = 1) {
  return Math.round((min + rand() * (max - min)) * 10 ** dp) / 10 ** dp;
}
function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)];
}

async function main() {
  const [{ count }] = (
    await db.execute(sql`SELECT count(*)::int AS count FROM cadets`)
  ).rows as Array<{ count: number }>;

  if (Number(count) > 0) {
    console.log("Database already seeded — skipping.");
    await pool.end();
    return;
  }

  console.log("Seeding Paramount OpsEngine…");

  // ------- Staff users -------
  await db.insert(users).values([
    { email: "dg@paramount.in", passwordHash: PASSWORD, fullName: "Cmde. R.K. Awasthi (Retd.)", role: "DIRECTOR_GENERAL", campus: "Gwalior HQ" },
    { email: "coo@paramount.in", passwordHash: PASSWORD, fullName: "Capt. Meera Krishnan", role: "COO", campus: "Gwalior HQ" },
    { email: "campus@paramount.in", passwordHash: PASSWORD, fullName: "Vikram Singh Chauhan", role: "CAMPUS_MANAGER", campus: "Patna Spoke" },
    { email: "academics@paramount.in", passwordHash: PASSWORD, fullName: "Dr. Ananya Bose", role: "ACADEMIC_LEAD", campus: "Gwalior HQ" },
    { email: "warden@paramount.in", passwordHash: PASSWORD, fullName: "Sub. Maj. Balwant Rana", role: "CHIEF_WARDEN", campus: "Gwalior HQ" },
    { email: "sales@paramount.in", passwordHash: PASSWORD, fullName: "Priya Nair", role: "SALES_EXECUTIVE", campus: "Gwalior HQ" },
  ]);

  // ------- 25 cadets -------
  const floors = ["A", "B", "C"];
  const cadetRows = CADET_NAMES.map((name, i) => {
    const stream = STREAMS[i % 4];
    const isOfficer = stream !== "GP_RATING";
    const first = name.split(" ")[0].toLowerCase();
    const hasRoom = i % 5 !== 4; // some unassigned
    return {
      rollNumber: `PMI-2026-${String(i + 1).padStart(3, "0")}`,
      fullName: name,
      email: `${first}.${i + 1}@cadet.paramount.in`,
      phone: `+91 9${String(100000000 + Math.floor(rand() * 899999999)).slice(0, 9)}`,
      batch: BATCHES[i % 3],
      stream,
      campus: CAMPUSES[i % 4],
      hostelRoom: hasRoom ? `${floors[i % 3]}-${101 + Math.floor(i / 3)}` : null,
      medicalStatus: "PENDING" as const,
      pcmPercentage: isOfficer ? between(61, 94) : between(45, 88),
      englishScore: between(55, 96),
    };
  });
  const insertedCadets = await db.insert(cadets).values(cadetRows).returning();
  console.log(`  ✓ ${insertedCadets.length} cadets`);

  // ------- 10 medical audits -------
  const auditPlans = [
    { pass: true }, { pass: true }, { pass: true }, { pass: true }, { pass: true },
    { pass: true }, { pass: true }, { vision: false }, { vision: false }, { ishihara: false },
  ];
  for (let i = 0; i < 10; i++) {
    const cadet = insertedCadets[i];
    const plan = auditPlans[i];
    const visionUnaided = plan.vision === false ? false : true;
    const ishiharaPassed = plan.ishihara === false ? false : true;
    await db.insert(medicalAudits).values({
      cadetId: cadet.id,
      visionUnaided,
      ishiharaPassed,
      auditedBy: "Dr. S. Venkatesh (MMD Approved)",
      notes: visionUnaided && ishiharaPassed
        ? "6/6 both eyes unaided. All 38 Ishihara plates read correctly. Fit as per DG Shipping M.S. Medical Rules."
        : !visionUnaided
          ? "Right eye 6/9 unaided — fails 6/6 unaided requirement. Advised re-test after rest; spectacle correction not permitted for deck stream."
          : "Failed Ishihara plates 14, 22, 29 — protan deficiency suspected. Referred for Farnsworth lantern confirmation.",
    });
    const status = !visionUnaided
      ? "FAILED_VISION"
      : !ishiharaPassed
        ? "FAILED_COLOR_BLINDNESS"
        : "PASSED";
    await db.execute(
      sql`UPDATE cadets SET medical_status = ${status}::medical_status WHERE id = ${cadet.id}`
    );
  }
  console.log("  ✓ 10 medical audits");

  // ------- 15 viva evaluations -------
  const evaluators = ["Capt. J. Fernandes", "C/E T. Radhakrishnan", "Capt. Meera Krishnan", "Dr. Ananya Bose"];
  const remarksBank = [
    "Solid COLREGS fundamentals; needs sharper situational awareness answers.",
    "Excellent bearing and turnout. Communication crisp and confident.",
    "Technical depth adequate; advised to revise stability and MARPOL annexes.",
    "Fluent English, calm under cross-questioning. Strong sponsorship prospect.",
    "Hesitant on engine-room basics; recommended remedial technical sessions.",
    "Outstanding mock performance — shortlist for final company panel.",
  ];
  const vivaRows = Array.from({ length: 15 }, (_, i) => {
    const cadet = insertedCadets[(i * 3 + 2) % insertedCadets.length];
    return {
      cadetId: cadet.id,
      company: COMPANIES[i % 4],
      technicalScore: between(4, 9.5, 1),
      fluencyScore: between(4.5, 9.5, 1),
      confidenceScore: between(4, 10, 1),
      evaluatorName: pick(evaluators),
      remarks: pick(remarksBank),
    };
  });
  await db.insert(vivaScores).values(vivaRows);
  console.log("  ✓ 15 viva evaluations");

  // ------- Full CBT exam: all 25 cadets ranked AIR 1-25 -------
  const examTitle = "IMU-CET Mock Series IV — All India";
  const cbtRows = insertedCadets.map((c) => {
    const physics = between(32, 96, 0);
    const chemistry = between(35, 94, 0);
    const math = between(28, 98, 0);
    const total = Math.round(((physics + chemistry + math) / 3) * 100) / 100;
    return { cadetId: c.id, examTitle, physics, chemistry, math, totalScore: total, allIndiaRank: 0 };
  });
  cbtRows.sort((a, b) => b.totalScore - a.totalScore);
  cbtRows.forEach((r, i) => (r.allIndiaRank = i + 1));
  await db.insert(cbtScores).values(cbtRows);
  console.log("  ✓ CBT exam dataset (AIR 1–25)");

  // ------- Disciplinary logs -------
  await db.insert(disciplinaryLogs).values([
    { cadetId: insertedCadets[4].id, incident: "Absent from 2100 hrs nightly muster without leave chit.", severity: "MEDIUM", actionTaken: "Written warning + 3 days extra PT drill." },
    { cadetId: insertedCadets[9].id, incident: "Mobile phone usage during study hours in B-deck common room.", severity: "LOW", actionTaken: "Verbal counselling by Chief Warden; phone deposited for 48 hrs." },
    { cadetId: insertedCadets[14].id, incident: "Altercation with mess staff over dinner service timing.", severity: "CRITICAL", actionTaken: "Escalated to COO; suspension of shore leave for 2 weeks pending inquiry." },
    { cadetId: insertedCadets[7].id, incident: "Improper rig during morning divisions — repeated offence.", severity: "LOW", actionTaken: "Uniform inspection duty for one week." },
    { cadetId: insertedCadets[19].id, incident: "Found outside hostel perimeter after lights-out (2320 hrs).", severity: "MEDIUM", actionTaken: "Parents notified; gate log restriction imposed for 10 days." },
  ]);
  console.log("  ✓ 5 disciplinary logs");

  // ------- Today's roll call (partial) -------
  const today = new Date().toISOString().slice(0, 10);
  await db.insert(rollCalls).values(
    insertedCadets.slice(0, 18).map((c, i) => ({
      cadetId: c.id,
      date: today,
      present: i % 7 !== 6,
      markedBy: "Sub. Maj. Balwant Rana",
    }))
  );
  console.log("  ✓ Nightly roll-call entries");

  // ------- Admissions CRM leads -------
  const LEAD_NAMES = [
    "Rahul Deshpande", "Sneha Kulkarni", "Ayush Rana", "Farhan Qureshi", "Meghana Rao",
    "Karan Bhatia", "Divya Menon", "Sahil Chopra", "Aditi Verma", "Nikhil Ghosh",
    "Pooja Reddy", "Imran Sheikh", "Rohit Naik", "Tanvi Joshi", "Varun Pillai",
    "Ananya Das", "Gaurav Solanki", "Kritika Sharma",
  ];
  const LEAD_STAGES = [
    "NEW", "NEW", "CONTACTED", "CONTACTED", "QUALIFIED", "QUALIFIED", "COUNSELING",
    "COUNSELING", "APPLICATION", "APPLICATION", "ADMITTED", "ADMITTED", "ENROLLED",
    "ENROLLED", "LOST", "NEW", "COUNSELING", "QUALIFIED",
  ] as const;
  const SOURCES = ["WEBSITE", "REFERRAL", "WALK_IN", "SOCIAL_MEDIA", "EDUCATION_FAIR", "ADVERTISEMENT", "COLD_CALL"] as const;
  const CITIES = ["Kanpur", "Lucknow", "Ranchi", "Bhopal", "Indore", "Varanasi", "Nagpur", "Raipur", "Jaipur", "Agra"];
  const COUNSELLORS = ["Priya Nair", "Rajesh Kumar", "Sonia Malhotra"];
  const FEES = [450000, 480000, 520000, 380000, 610000];

  const leadRows = LEAD_NAMES.map((name, i) => {
    const first = name.split(" ")[0].toLowerCase();
    return {
      fullName: name,
      email: `${first}${i + 1}@gmail.com`,
      phone: `+91 8${String(100000000 + Math.floor(rand() * 899999999)).slice(0, 9)}`,
      city: CITIES[i % CITIES.length],
      stage: LEAD_STAGES[i],
      source: SOURCES[i % SOURCES.length],
      interestedStream: STREAMS[i % 4],
      interestedBatch: BATCHES[i % 3],
      owner: COUNSELLORS[i % 3],
      campus: CAMPUSES[i % 4],
      estimatedFee: FEES[i % FEES.length],
      score: Math.round(between(30, 95, 0)),
      notes:
        i % 3 === 0
          ? "Parent keen on DNS placement record; comparing with a Chennai institute."
          : i % 3 === 1
            ? "Strong PCM background, wants scholarship details for ELITE batch."
            : "Enquired via education fair; needs hostel and fee-instalment info.",
      nextFollowUp:
        LEAD_STAGES[i] === "ENROLLED" || LEAD_STAGES[i] === "LOST"
          ? null
          : new Date(Date.now() + (i % 7) * 86400000).toISOString().slice(0, 10),
    };
  });
  const insertedLeads = await db.insert(leads).values(leadRows).returning();
  console.log(`  ✓ ${insertedLeads.length} CRM leads`);

  const activityTypes = ["CALL", "EMAIL", "WHATSAPP", "MEETING", "SITE_VISIT"] as const;
  const activitySummaries = [
    "Initial call — explained DNS vs GP Rating pathways and sponsorship tie-ups.",
    "Sent brochure and fee structure over email; awaiting parent response.",
    "WhatsApp follow-up shared placement statistics for last 3 batches.",
    "Counselling session held; discussed medical eligibility and hostel life.",
    "Campus site visit completed with family; toured simulator and hostel.",
    "Discussed instalment plan and scholarship eligibility for ELITE batch.",
  ];
  const activityValues: Array<{ leadId: number; type: (typeof activityTypes)[number]; summary: string; createdBy: string; createdAt: Date }> = [];
  insertedLeads.forEach((lead, idx) => {
    const n = 1 + (idx % 3);
    for (let k = 0; k < n; k++) {
      activityValues.push({
        leadId: lead.id,
        type: activityTypes[(idx + k) % activityTypes.length],
        summary: activitySummaries[(idx + k) % activitySummaries.length],
        createdBy: COUNSELLORS[idx % 3],
        createdAt: new Date(Date.now() - (n - k) * 86400000),
      });
    }
  });
  await db.insert(leadActivities).values(activityValues);
  console.log(`  ✓ ${activityValues.length} CRM activities`);

  console.log("Seed complete. ⚓");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
