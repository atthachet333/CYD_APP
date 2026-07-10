import fs from "fs";
import path from "path";
import { safeFileNameFrom } from "@/lib/docDebug";

export type DocumentType = "passport" | "visa" | "work_permit" | "ninety_day";
export type DocumentAlertSource = "spx_document" | "admin_document" | "legacy_main_document";
export type DocumentAlertStatus =
  | "normal"
  | "warning"
  | "warning_soon"
  | "urgent"
  | "expired"
  | "overdue"
  | "missing_date";

export const DOCUMENT_ALERT_FIELDS = [
  { documentType: "passport", dateField: "passport_expiry_date", fileField: "passport_file", label: "Passport" },
  { documentType: "visa", dateField: "visa_expiry_date", fileField: "visa_file", label: "Visa" },
  { documentType: "work_permit", dateField: "work_permit_expiry_date", fileField: "work_permit_file", label: "Work Permit" },
  { documentType: "ninety_day", dateField: "ninety_day_report_date", legacyDateField: "report_90_days_date", fileField: "ninety_day_file", label: "90 Days" },
] as const;

const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");
const DOCUMENT_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];

function newDocumentFileExists(
  emp: any,
  employeeId: number,
  documentType: DocumentType,
  fileField: string
) {
  const storedFileName = path.basename(String(emp[fileField] || ""));
  const ext = path.extname(storedFileName).toLowerCase();
  if (!DOCUMENT_EXTENSIONS.includes(ext) || path.parse(storedFileName).name !== documentType) return false;

  const empCode = emp.emp_code || null;
  const folderName = safeFileNameFrom(empCode || `employee-${employeeId}`);
  return fs.existsSync(path.join(DOCUMENTS_ROOT, folderName, `${documentType}${ext}`));
}

function safeLegacyFileName(fileName: unknown) {
  const value = String(fileName || "").trim();
  if (!value || value.includes("..") || value.includes("/") || value.includes("\\") || path.basename(value) !== value) {
    return "";
  }
  return value;
}

function legacyDocumentFileExists(fileName: string) {
  return [
    path.join(process.cwd(), "private_uploads", fileName),
    path.join(process.cwd(), "private_uploads", "employee_docs", fileName),
    path.join(process.cwd(), "public", "uploads", fileName),
    path.join(process.cwd(), "uploads", "employee_docs", fileName),
  ].some((candidate) => fs.existsSync(candidate));
}

export type DocumentExpiryAlertItem = {
  employeeId: number;
  emp_code: string | null;
  employeeName: string;
  companyId: number | null;
  companyName: string;
  documentType: DocumentType;
  documentLabel: string;
  dueDate: string;
  expiryDate: string;
  daysRemaining: number;
  status: Exclude<DocumentAlertStatus, "normal" | "missing_date">;
  statusLabel: string;
  source: DocumentAlertSource;
  hasFile: boolean;
  fileStatus: "available" | "missing";
  viewUrl: string;
};

export type DocumentExpirySummary = {
  total: number;
  warning: number;
  warning_soon: number;
  urgent: number;
  expired: number;
  overdue: number;
};

function startOfDay(value: Date) {
  const d = new Date(value);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(value: Date) {
  const d = startOfDay(value);
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export function getDaysRemaining(targetDate: Date | string | null | undefined) {
  if (!targetDate) return null;
  const target = startOfDay(new Date(targetDate));
  if (Number.isNaN(target.getTime())) return null;
  const today = startOfDay(new Date());
  return Math.ceil((target.getTime() - today.getTime()) / 86400000);
}

export function getDocumentAlertStatus(
  targetDate: Date | string | null | undefined,
  documentType?: DocumentType
): DocumentAlertStatus {
  const days = getDaysRemaining(targetDate);
  if (days === null) return "missing_date";
  if (days < 0) return documentType === "ninety_day" ? "overdue" : "expired";
  if (days <= 7) return "urgent";
  if (days <= 15) return "warning_soon";
  if (days <= 30) return "warning";
  return "normal";
}

export function getDocumentAlertLabel(status: DocumentAlertStatus) {
  const labels: Record<DocumentAlertStatus, string> = {
    normal: "ปกติ",
    warning: "ใกล้หมดอายุ",
    warning_soon: "ใกล้มาก",
    urgent: "เร่งด่วน",
    expired: "หมดอายุแล้ว",
    overdue: "เลยกำหนดแล้ว",
    missing_date: "ไม่มีวันที่",
  };
  return labels[status];
}

export function getDocumentTypeLabel(documentType: DocumentType) {
  return DOCUMENT_ALERT_FIELDS.find((item) => item.documentType === documentType)?.label || documentType;
}

export function emptyDocumentExpirySummary(): DocumentExpirySummary {
  return { total: 0, warning: 0, warning_soon: 0, urgent: 0, expired: 0, overdue: 0 };
}

export function buildDocumentExpiryAlerts(
  employees: any[],
  companyNameById: Map<number, string> = new Map()
) {
  const summary = emptyDocumentExpirySummary();
  const items: DocumentExpiryAlertItem[] = [];

  for (const emp of employees) {
    for (const field of DOCUMENT_ALERT_FIELDS) {
      const rawDate = emp[field.dateField] || ("legacyDateField" in field ? emp[field.legacyDateField] : null);
      const status = getDocumentAlertStatus(rawDate, field.documentType);
      if (status === "normal" || status === "missing_date") continue;

      const daysRemaining = getDaysRemaining(rawDate);
      if (daysRemaining === null) continue;

      summary[status]++;
      const employeeId = Number(emp.id);
      const hasNewDocumentFile = newDocumentFileExists(emp, employeeId, field.documentType, field.fileField);
      const legacyFileName = safeLegacyFileName(emp.document_file_name);
      const hasLegacyFile = !hasNewDocumentFile && legacyFileName ? legacyDocumentFileExists(legacyFileName) : false;
      const source: DocumentAlertSource = hasNewDocumentFile ? "spx_document" : "legacy_main_document";
      const hasFile = hasNewDocumentFile || hasLegacyFile;
      items.push({
        employeeId,
        emp_code: emp.emp_code || null,
        employeeName:
          `${emp.first_name_th || emp.first_name_en || emp.first_name || ""} ${emp.last_name_th || emp.last_name_en || emp.last_name || ""}`.trim() ||
          emp.emp_code ||
          `employee-${employeeId}`,
        companyId: emp.company_id ? Number(emp.company_id) : null,
        companyName: companyNameById.get(Number(emp.company_id)) || "-",
        documentType: field.documentType,
        documentLabel: field.label,
        dueDate: formatDate(new Date(rawDate)),
        expiryDate: formatDate(new Date(rawDate)),
        daysRemaining,
        status,
        statusLabel: getDocumentAlertLabel(status),
        source,
        hasFile,
        fileStatus: hasFile ? "available" : "missing",
        viewUrl: hasNewDocumentFile
          ? `/api/documents/view?employeeId=${encodeURIComponent(String(employeeId))}&documentType=${field.documentType}`
          : legacyFileName
            ? `/api/documents/${encodeURIComponent(legacyFileName)}`
            : "",
      });
    }
  }

  const severity = { overdue: 0, expired: 1, urgent: 2, warning_soon: 3, warning: 4 };
  items.sort((a, b) => severity[a.status] - severity[b.status] || a.daysRemaining - b.daysRemaining);
  summary.total = items.length;

  return { summary, items };
}
