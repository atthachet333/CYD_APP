import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

const INTERNAL_ROLES = new Set(["ADMIN", "STAFF", "SUPERADMIN"]);
const PENDING_ROOT = path.join(process.cwd(), "private_uploads", "pending_document_approvals");

async function currentUser(session: any) {
  const username = session?.user?.username || session?.user?.name || "";
  const email = session?.user?.email || "";

  return prisma.users.findFirst({
    where: { OR: [{ username }, { email }, { full_name: session?.user?.name || "" }] },
    include: { roles: true },
  });
}

function parsePayload(value: string) {
  try {
    return JSON.parse(value || "{}");
  } catch {
    return {};
  }
}

function contentTypeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();
  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

export async function GET(_request: Request, props: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const user = await currentUser(session);
  const role = String(user?.roles?.name || (session.user as any)?.role || "").toUpperCase();
  if (!INTERNAL_ROLES.has(role)) return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });

  const { id: rawId } = await props.params;
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) return NextResponse.json({ ok: false, error: "Invalid approval id" }, { status: 400 });

  const approval = await prisma.employee_document_approvals.findUnique({ where: { id } });
  if (!approval) return NextResponse.json({ ok: false, message: "ไม่พบไฟล์เอกสาร" }, { status: 404 });

  const payload = parsePayload(approval.payload_json);
  const documentType = String(payload.documentType || "").toLowerCase();
  const ext = String(payload.stagedFile?.ext || "").toLowerCase();
  if (!["passport", "visa", "work_permit", "ninety_day"].includes(documentType) || ![".pdf", ".png", ".jpg", ".jpeg", ".webp"].includes(ext)) {
    return NextResponse.json({ ok: false, message: "ไม่พบไฟล์เอกสาร" }, { status: 404 });
  }

  const fileName = `${documentType}${ext}`;
  const filePath = path.join(PENDING_ROOT, String(id), fileName);
  if (!fs.existsSync(filePath)) return NextResponse.json({ ok: false, message: "ไม่พบไฟล์เอกสาร" }, { status: 404 });

  return new NextResponse(fs.readFileSync(filePath), {
    headers: {
      "Content-Type": contentTypeFor(fileName),
      "Content-Disposition": `inline; filename="${fileName}"`,
      "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
      Vary: "Cookie",
    },
  });
}
