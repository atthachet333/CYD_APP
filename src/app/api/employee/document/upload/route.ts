import fs from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createRequestId,
  logDoc,
  logDocError,
  requestHeadersForDebug,
  safeFileNameFrom,
} from "@/lib/docDebug";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "DOC_UPLOAD START", requestHeadersForDebug(request));

  try {
    const session = await getServerSession();
    logDoc(requestId, "session", { exists: !!session });

    const formData = await request.formData();
    const employeeId = formData.get("employee_id") || formData.get("profile_id") || formData.get("id");
    const documentType = formData.get("document_type") || formData.get("type") || "main_document";
    const file = (formData.get("file") || formData.get("main_document")) as File | null;

    logDoc(requestId, "form data", {
      formKeys: Array.from(formData.keys()),
      employeeId,
      documentType,
      fileExists: !!file && file.size > 0,
      fileName: file?.name || null,
      fileSize: file?.size || 0,
      fileType: file?.type || null,
    });

    if (!employeeId) {
      logDoc(requestId, "DOC_UPLOAD END", {
        status: 400,
        reason: "missing employee_id/profile_id",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Missing employee_id or profile_id", requestId },
        { status: 400 },
      );
    }

    if (!file || file.size === 0) {
      logDoc(requestId, "DOC_UPLOAD END", {
        status: 400,
        reason: "missing file",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Missing file", requestId },
        { status: 400 },
      );
    }

    const before = await prisma.employee_document_profiles.findUnique({
      where: { id: Number(employeeId) },
    });

    logDoc(requestId, "employee before update", {
      employeeId: before?.id || null,
      document_file_name: before?.document_file_name || null,
    });

    if (!before) {
      logDoc(requestId, "DOC_UPLOAD END", {
        status: 404,
        reason: "employee not found",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Employee not found", requestId },
        { status: 404 },
      );
    }

    const uploadDir = path.join(process.cwd(), "private_uploads");
    logDoc(requestId, "uploadDir", {
      cwd: process.cwd(),
      uploadDir,
      exists: fs.existsSync(uploadDir),
    });

    if (!fs.existsSync(uploadDir)) {
      logDoc(requestId, "creating uploadDir", { uploadDir });
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const originalFileName = file.name;
    const safeFileName = safeFileNameFrom(path.basename(originalFileName));
    const filePath = path.join(uploadDir, safeFileName);

    logDoc(requestId, "file save before", {
      originalFileName,
      safeFileName,
      filePath,
      existsBefore: fs.existsSync(filePath),
    });

    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filePath, buffer);

    logDoc(requestId, "file save after", {
      filePath,
      existsAfter: fs.existsSync(filePath),
      savedFileSize: fs.statSync(filePath).size,
    });

    const updateData = { document_file_name: safeFileName };
    logDoc(requestId, "DB update data", {
      field: "document_file_name",
      updateData,
    });

    const updated = await prisma.employee_document_profiles.update({
      where: { id: Number(employeeId) },
      data: updateData,
    });

    logDoc(requestId, "DB update result", {
      employeeId: updated.id,
      document_file_name: updated.document_file_name,
    });
    logDoc(requestId, "DOC_UPLOAD END", {
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      employeeId: updated.id,
      document_file_name: updated.document_file_name,
      path: `/api/documents/${encodeURIComponent(updated.document_file_name || "")}`,
    });
  } catch (error: any) {
    logDocError(requestId, "DOC_UPLOAD ERROR", error);
    logDoc(requestId, "DOC_UPLOAD END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to upload document", requestId },
      { status: 500 },
    );
  }
}
