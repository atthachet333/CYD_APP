export const dynamic = "force-dynamic";
export const revalidate = 0;
export const fetchCache = "force-no-store";

import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import {
  createRequestId,
  logDoc,
  logDocError,
  requestHeadersForDebug,
} from "@/lib/docDebug";

function contentTypeFor(fileName: string) {
  const ext = path.extname(fileName).toLowerCase();

  if (ext === ".pdf") return "application/pdf";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";

  return "application/octet-stream";
}

function jsonError(
  requestId: string,
  error: string,
  status: number,
  extra?: Record<string, unknown>
) {
  return NextResponse.json(
    {
      ok: false,
      error,
      requestId,
      ...extra,
    },
    { status }
  );
}

function fileNameWithoutExt(fileName: string) {
  return fileName.replace(/\.[^/.]+$/, "");
}

export async function GET(
  request: Request,
  props: { params: Promise<{ filename: string }> }
) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "DOC_VIEW START", requestHeadersForDebug(request));

  try {
    const params = await props.params;

    const rawFilename = params.filename;
    const decodedFilename = decodeURIComponent(rawFilename || "");
    const filenameNoExt = fileNameWithoutExt(decodedFilename);

    const hasDotDot = decodedFilename.includes("..");
    const hasSlash =
      decodedFilename.includes("/") || decodedFilename.includes("\\");

    logDoc(requestId, "filename", {
      rawFilename,
      decodedFilename,
      filenameNoExt,
      hasDotDot,
      hasSlash,
    });

    const session = await getServerSession();

    logDoc(requestId, "session", {
      exists: !!session,
    });

    if (!session?.user) {
      logDoc(requestId, "DOC_VIEW END", {
        status: 401,
        reason: "missing session",
        durationMs: Date.now() - startedAt,
      });

      // 🟢 จุดที่แก้ไข: เปลี่ยนจาก jsonError เป็นหน้า HTML แจ้งเตือนสีแดงแทน
      const htmlWarning = `
        <!DOCTYPE html>
        <html lang="th">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>ปฏิเสธการเข้าถึง</title>
          <style>
            body { display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; }
            .alert-box { text-align: center; background: white; padding: 40px; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-top: 5px solid #ef4444; }
            h2 { color: #ef4444; font-size: 24px; margin-top: 0; margin-bottom: 12px; }
            p { color: #64748b; margin-bottom: 24px; font-size: 15px; }
            a { text-decoration: none; background-color: #3b82f6; color: white; padding: 12px 24px; border-radius: 8px; font-weight: bold; transition: background-color 0.2s; display: inline-block; }
            a:hover { background-color: #2563eb; }
          </style>
        </head>
        <body>
          <div class="alert-box">
            <h2>⚠️ คุณไม่มีสิทธิ์ กรุณา Login</h2>
            <p>ระบบไม่อนุญาตให้เปิดดูเอกสาร เนื่องจากคุณยังไม่ได้เข้าสู่ระบบ</p>
            <a href="/login">ไปที่หน้าเข้าสู่ระบบ</a>
          </div>
        </body>
        </html>
      `;

      return new NextResponse(htmlWarning, {
        status: 401,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
        },
      });
    }

    if (!decodedFilename) {
      logDoc(requestId, "DOC_VIEW END", {
        status: 400,
        reason: "missing filename",
        durationMs: Date.now() - startedAt,
      });

      return jsonError(requestId, "Missing filename", 400, {
        reason: "MISSING_FILENAME",
      });
    }

    if (
      hasDotDot ||
      hasSlash ||
      path.basename(decodedFilename) !== decodedFilename
    ) {
      logDoc(requestId, "DOC_VIEW END", {
        status: 400,
        reason: "unsafe filename",
        decodedFilename,
        hasDotDot,
        hasSlash,
        durationMs: Date.now() - startedAt,
      });

      return jsonError(requestId, "Invalid filename", 400, {
        reason: "UNSAFE_FILENAME",
        decodedFilename,
        hasDotDot,
        hasSlash,
      });
    }

    /**
     * หา user จาก session
     */
    const identifier = session.user?.name || session.user?.email || "";

    const userInDb = await prisma.users.findFirst({
      where: {
        OR: [
          { username: identifier },
          { email: identifier },
          { full_name: identifier },
        ],
      },
      include: {
        roles: true,
      },
    });

    const roleName = String(
      userInDb?.roles?.name || (session.user as any)?.role || ""
    ).toUpperCase();

    const userCompanyId =
      userInDb?.company_id || (session.user as any)?.companyId || null;

    logDoc(requestId, "authorization context", {
      identifier,
      userFound: !!userInDb,
      roleName,
      userCompanyId,
    });

    /**
     * สำคัญ:
     * ไฟล์ใหม่ต้องหา employee จาก document_file_name ก่อน
     * เช่น document_file_name = CYD-SAQ0010.pdf
     * หรือ main_document_file_xxx.pdf
     *
     * ถ้าไม่เจอ ค่อย fallback หาแบบระบบเก่า:
     * emp_code = filename without extension
     * เช่น CYD-SAQ0010.pdf -> CYD-SAQ0010
     */
    let employee = await prisma.employee_document_profiles.findFirst({
      where: {
        document_file_name: decodedFilename,
      },
    });

    let matchedBy = "document_file_name";

    if (!employee) {
      employee = await prisma.employee_document_profiles.findFirst({
        where: {
          emp_code: filenameNoExt,
        },
      });

      matchedBy = "emp_code";
    }

    logDoc(requestId, "document authorization lookup", {
      decodedFilename,
      filenameNoExt,
      matchedBy,
      employeeId: employee?.id || null,
      employeeEmpCode: employee?.emp_code || null,
      employeeDocumentFileName: employee?.document_file_name || null,
      employeeCompanyId: employee?.company_id || null,
      userCompanyId,
      roleName,
    });

    const isAdmin =
      roleName === "ADMIN" ||
      roleName === "STAFF" ||
      roleName === "SUPERADMIN";

    if (!employee) {
      logDoc(requestId, "DOC_VIEW END", {
        status: 403,
        reason: "employee not found by document_file_name or emp_code",
        decodedFilename,
        filenameNoExt,
        durationMs: Date.now() - startedAt,
      });

      return jsonError(requestId, "Forbidden", 403, {
        reason: "EMPLOYEE_NOT_FOUND_BY_DOCUMENT_FILE_NAME_OR_EMP_CODE",
        decodedFilename,
        filenameNoExt,
      });
    }

    if (!isAdmin && Number(employee.company_id) !== Number(userCompanyId)) {
      logDoc(requestId, "DOC_VIEW END", {
        status: 403,
        reason: "company mismatch",
        employeeId: employee.id,
        employeeCompanyId: employee.company_id,
        userCompanyId,
        durationMs: Date.now() - startedAt,
      });

      return jsonError(requestId, "Forbidden", 403, {
        reason: "COMPANY_MISMATCH",
        employeeId: employee.id,
        employeeCompanyId: employee.company_id,
        userCompanyId,
      });
    }

    /**
     * หาไฟล์จริง
     * รองรับทั้ง path ใหม่และ path เก่า
     */
    const cwd = process.cwd();

    const candidatePaths = [
      {
        label: "private_uploads",
        value: path.join(
          /*turbopackIgnore: true*/ process.cwd(),
          "private_uploads",
          decodedFilename
        ),
      },
      {
        label: "private_uploads/employee_docs",
        value: path.join(
          /*turbopackIgnore: true*/ process.cwd(),
          "private_uploads",
          "employee_docs",
          decodedFilename
        ),
      },
      {
        label: "public/uploads",
        value: path.join(
          /*turbopackIgnore: true*/ process.cwd(),
          "public",
          "uploads",
          decodedFilename
        ),
      },
      {
        label: "uploads/employee_docs",
        value: path.join(
          /*turbopackIgnore: true*/ process.cwd(),
          "uploads",
          "employee_docs",
          decodedFilename
        ),
      },
    ];

    logDoc(requestId, "path roots", {
      cwd,
    });

    const candidateLogs = candidatePaths.map((candidate) => {
      const exists = fs.existsSync(candidate.value);

      return {
        label: candidate.label,
        candidatePath: candidate.value,
        exists,
        fileSize: exists ? fs.statSync(candidate.value).size : null,
      };
    });

    logDoc(requestId, "candidate paths", candidateLogs);

    const selected = candidatePaths.find((candidate) =>
      fs.existsSync(candidate.value)
    );

    if (!selected) {
      logDoc(requestId, "DOC_VIEW END", {
        status: 404,
        reason: "file not found",
        decodedFilename,
        durationMs: Date.now() - startedAt,
      });

      return jsonError(requestId, "File not found", 404, {
        reason: "FILE_NOT_FOUND",
        decodedFilename,
        candidates: candidateLogs,
      });
    }

    const fileBuffer = fs.readFileSync(selected.value);
    const contentType = contentTypeFor(decodedFilename);

    /**
     * รองรับชื่อไฟล์ไทย/ช่องว่าง/วงเล็บ
     */
    const contentDisposition = `inline; filename*=UTF-8''${encodeURIComponent(
      decodedFilename
    )}`;

    logDoc(requestId, "selected file", {
      selectedPath: selected.value,
      contentType,
      contentDisposition,
      fileSize: fileBuffer.length,
    });

    logDoc(requestId, "DOC_VIEW END", {
      status: 200,
      matchedBy,
      employeeId: employee.id,
      durationMs: Date.now() - startedAt,
    });

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": contentDisposition,
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, private, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
        "Surrogate-Control": "no-store",
        Vary: "Cookie",
      },
    });
  } catch (error) {
    logDocError(requestId, "DOC_VIEW ERROR", error);

    logDoc(requestId, "DOC_VIEW END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });

    return jsonError(requestId, "Failed to view document", 500, {
      reason: "DOC_VIEW_INTERNAL_ERROR",
    });
  }
}