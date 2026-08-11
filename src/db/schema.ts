import {
  pgTable,
  pgEnum,
  text,
  serial,
  integer,
  real,
  boolean,
  timestamp,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("role", [
  "DIRECTOR_GENERAL",
  "COO",
  "CAMPUS_MANAGER",
  "ACADEMIC_LEAD",
  "CHIEF_WARDEN",
  "SALES_EXECUTIVE",
]);

export const leadStageEnum = pgEnum("lead_stage", [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "COUNSELING",
  "APPLICATION",
  "ADMITTED",
  "ENROLLED",
  "LOST",
]);

export const leadSourceEnum = pgEnum("lead_source", [
  "WEBSITE",
  "REFERRAL",
  "WALK_IN",
  "SOCIAL_MEDIA",
  "EDUCATION_FAIR",
  "ADVERTISEMENT",
  "COLD_CALL",
]);

export const activityTypeEnum = pgEnum("activity_type", [
  "CALL",
  "EMAIL",
  "MEETING",
  "WHATSAPP",
  "NOTE",
  "SITE_VISIT",
]);

export const batchEnum = pgEnum("batch_name", ["ECHO", "VICTOR", "ELITE"]);

export const streamEnum = pgEnum("stream", [
  "DNS_OFFICER",
  "BSC_NAUTICAL",
  "BTECH_MARINE",
  "GP_RATING",
]);

export const medicalStatusEnum = pgEnum("medical_status", [
  "PASSED",
  "PENDING",
  "FAILED_VISION",
  "FAILED_COLOR_BLINDNESS",
]);

export const severityEnum = pgEnum("severity", ["LOW", "MEDIUM", "CRITICAL"]);

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  role: roleEnum("role").notNull(),
  campus: text("campus").notNull().default("Gwalior HQ"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cadets = pgTable("cadets", {
  id: serial("id").primaryKey(),
  rollNumber: text("roll_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  batch: batchEnum("batch").notNull(),
  stream: streamEnum("stream").notNull(),
  campus: text("campus").notNull().default("Gwalior HQ"),
  hostelRoom: text("hostel_room"),
  medicalStatus: medicalStatusEnum("medical_status").notNull().default("PENDING"),
  pcmPercentage: real("pcm_percentage").notNull(),
  englishScore: real("english_score").notNull(),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const vivaScores = pgTable("viva_scores", {
  id: serial("id").primaryKey(),
  cadetId: integer("cadet_id")
    .notNull()
    .references(() => cadets.id, { onDelete: "cascade" }),
  company: text("company").notNull(),
  technicalScore: real("technical_score").notNull(),
  fluencyScore: real("fluency_score").notNull(),
  confidenceScore: real("confidence_score").notNull(),
  evaluatorName: text("evaluator_name").notNull(),
  remarks: text("remarks").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cbtScores = pgTable("cbt_scores", {
  id: serial("id").primaryKey(),
  cadetId: integer("cadet_id")
    .notNull()
    .references(() => cadets.id, { onDelete: "cascade" }),
  examTitle: text("exam_title").notNull(),
  physics: real("physics").notNull(),
  chemistry: real("chemistry").notNull(),
  math: real("math").notNull(),
  totalScore: real("total_score").notNull(),
  allIndiaRank: integer("all_india_rank").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const disciplinaryLogs = pgTable("disciplinary_logs", {
  id: serial("id").primaryKey(),
  cadetId: integer("cadet_id")
    .notNull()
    .references(() => cadets.id, { onDelete: "cascade" }),
  incident: text("incident").notNull(),
  severity: severityEnum("severity").notNull(),
  actionTaken: text("action_taken").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const medicalAudits = pgTable("medical_audits", {
  id: serial("id").primaryKey(),
  cadetId: integer("cadet_id")
    .notNull()
    .references(() => cadets.id, { onDelete: "cascade" }),
  visionUnaided: boolean("vision_unaided").notNull().default(false), // 6/6 unaided
  ishiharaPassed: boolean("ishihara_passed").notNull().default(false),
  auditedBy: text("audited_by").notNull(),
  notes: text("notes").notNull().default(""),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const rollCalls = pgTable("roll_calls", {
  id: serial("id").primaryKey(),
  cadetId: integer("cadet_id")
    .notNull()
    .references(() => cadets.id, { onDelete: "cascade" }),
  date: text("date").notNull(), // YYYY-MM-DD
  present: boolean("present").notNull().default(true),
  markedBy: text("marked_by").notNull().default("Chief Warden"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  city: text("city").notNull().default(""),
  stage: leadStageEnum("stage").notNull().default("NEW"),
  source: leadSourceEnum("source").notNull().default("WEBSITE"),
  interestedStream: streamEnum("interested_stream").notNull().default("DNS_OFFICER"),
  interestedBatch: batchEnum("interested_batch").notNull().default("ECHO"),
  owner: text("owner").notNull().default("Unassigned"),
  campus: text("campus").notNull().default("Gwalior HQ"),
  estimatedFee: real("estimated_fee").notNull().default(0),
  score: integer("score").notNull().default(50),
  notes: text("notes").notNull().default(""),
  nextFollowUp: text("next_follow_up"), // YYYY-MM-DD
  convertedCadetId: integer("converted_cadet_id"),
  isArchived: boolean("is_archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const leadActivities = pgTable("lead_activities", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id")
    .notNull()
    .references(() => leads.id, { onDelete: "cascade" }),
  type: activityTypeEnum("type").notNull().default("NOTE"),
  summary: text("summary").notNull(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export type User = typeof users.$inferSelect;
export type Cadet = typeof cadets.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type LeadActivity = typeof leadActivities.$inferSelect;
export type VivaScore = typeof vivaScores.$inferSelect;
export type CbtScore = typeof cbtScores.$inferSelect;
export type DisciplinaryLog = typeof disciplinaryLogs.$inferSelect;
export type MedicalAudit = typeof medicalAudits.$inferSelect;
export type RollCall = typeof rollCalls.$inferSelect;
