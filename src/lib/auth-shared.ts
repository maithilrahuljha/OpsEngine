// Client-safe auth types & RBAC helpers (no server-only imports).

export type Role =
  | "DIRECTOR_GENERAL"
  | "COO"
  | "CAMPUS_MANAGER"
  | "ACADEMIC_LEAD"
  | "CHIEF_WARDEN"
  | "SALES_EXECUTIVE";

export interface Session {
  userId: number;
  email: string;
  name: string;
  role: Role;
  campus: string;
}

export type Resource =
  | "cadets"
  | "hostel"
  | "medical"
  | "viva"
  | "cbt"
  | "discipline"
  | "attendance"
  | "crm";

const WRITE_MATRIX: Record<Resource, Role[]> = {
  cadets: ["COO", "CAMPUS_MANAGER"],
  hostel: ["COO", "CAMPUS_MANAGER"],
  medical: ["COO", "CAMPUS_MANAGER"],
  viva: ["ACADEMIC_LEAD"],
  cbt: ["ACADEMIC_LEAD"],
  discipline: ["CHIEF_WARDEN", "COO", "CAMPUS_MANAGER"],
  attendance: ["CHIEF_WARDEN"],
  crm: ["SALES_EXECUTIVE", "COO", "CAMPUS_MANAGER"],
};

export function canWrite(role: Role, resource: Resource): boolean {
  return WRITE_MATRIX[resource].includes(role);
}

export const ROLE_LABELS: Record<Role, string> = {
  DIRECTOR_GENERAL: "Director General",
  COO: "Chief Operating Officer",
  CAMPUS_MANAGER: "Campus Manager",
  ACADEMIC_LEAD: "Academic Lead",
  CHIEF_WARDEN: "Chief Warden",
  SALES_EXECUTIVE: "Sales & Admissions Executive",
};
