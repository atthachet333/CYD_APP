import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { safeFileNameFrom } from "@/lib/docDebug";

const DOCUMENTS_ROOT = path.join(process.cwd(), "private_uploads", "employee_documents");

const DOCUMENT_TYPES = {
  passport: { fileBase: "passport", dbField: "passport_file" },
  pp: { fileBase: "passport", dbField: "passport_file" },
  visa: { fileBase: "visa", dbField: "visa_file" },
  vs: { fileBase: "visa", dbField: "visa_file" },
  work_permit: { fileBase: "work_permit", dbField: "work_permit_file" },
  workpermit: { fileBase: "work_permit", dbField: "work_permit_file" },
  ninety_day: { fileBase: "ninety_day", dbField: "ninety_day_file" },
  "90d": { fileBase: "ninety_day", dbField: "ninety_day_file" },
} as const;

function contentTypeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: {
      OR: [{ username }, { email }, { full_name: session?.user?.name || "" }],
    },
    include: { roles: true },
  });
}

async function findEmployee(employeeId: string) {
  const id = Number(employeeId);
  const byId = Number.isInteger(id)
    ? await prisma.employee_document_profiles.findUnique({ where: { id } })
    : null;

  return byId || prisma.employee_document_profiles.findFirst({
    where: { employee_id: employeeId },
  });
}

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const employeeId = searchParams.get("employeeId") || searchParams.get("profile_id") || searchParams.get("id");
  const rawType = searchParams.get("documentType") || searchParams.get("type");
  const documentType = String(rawType || "").trim().toLowerCase();
  const documentConfig = DOCUMENT_TYPES[documentType as keyof typeof DOCUMENT_TYPES];

  if (!employeeId || !documentConfig) {
    return NextResponse.json({ error: "Missing or invalid parameters" }, { status: 400 });
  }

  const employee = await findEmployee(employeeId);

  if (!employee) {
    return NextResponse.json({ ok: false, message: "ไม่พบไฟล์เอกสาร" }, { status: 404 });
  }

  const user = await currentUser(session);
  const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
  const isStaff = ["ADMIN", "STAFF", "SUPERADMIN"].includes(role);
  const sameCompany = user?.company_id && Number(user.company_id) === Number(employee.company_id);

  if (!isStaff && !sameCompany) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const employeeFolder = safeFileNameFrom(employee.emp_code || `employee-${employee.id}`);
  const storedPath = employee[documentConfig.dbField as keyof typeof employee] as string | null;
  const storedFileName = storedPath ? path.basename(storedPath) : "";
  const ext = path.extname(storedFileName);

  if (!ext || path.parse(storedFileName).name !== documentConfig.fileBase) {
    return NextResponse.json({ ok: false, message: "ไม่พบไฟล์เอกสาร" }, { status: 404 });
  }

  const filePath = path.join(DOCUMENTS_ROOT, employeeFolder, `${documentConfig.fileBase}${ext}`);

  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ ok: false, message: "ไม่พบไฟล์เอกสาร" }, { status: 404 });
  }

  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": contentTypeFor(filePath),
      "Content-Disposition": `inline; filename="${documentConfig.fileBase}${ext}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      Vary: "Cookie",
    },
  });
}
