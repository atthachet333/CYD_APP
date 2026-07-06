import fs from "fs";
import { writeFile } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import {
  createRequestId,
  logDoc,
  logDocError,
  requestHeadersForDebug,
  safeFileNameFrom,
} from "@/lib/docDebug";

export async function POST(req: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "LEGACY_UPLOAD START", requestHeadersForDebug(req));

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    logDoc(requestId, "form data", {
      formKeys: Array.from(formData.keys()),
      fileExists: !!file && file.size > 0,
      fileName: file?.name || null,
      fileSize: file?.size || 0,
      fileType: file?.type || null,
    });

    if (!file || file.size === 0) {
      logDoc(requestId, "LEGACY_UPLOAD END", {
        status: 400,
        reason: "missing file",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Missing file", requestId },
        { status: 400 },
      );
    }

    const uploadDir = path.join(process.cwd(), "private_uploads");
    logDoc(requestId, "uploadDir", {
      cwd: process.cwd(),
      uploadDir,
      exists: fs.existsSync(uploadDir),
    });

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const safeFileName = safeFileNameFrom(path.basename(file.name));
    const filePath = path.join(uploadDir, safeFileName);

    logDoc(requestId, "file save before", {
      originalFileName: file.name,
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
    logDoc(requestId, "LEGACY_UPLOAD END", {
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      ok: true,
      message: "Upload complete",
      path: `/private_uploads/${safeFileName}`,
      requestId,
    });
  } catch (error) {
    logDocError(requestId, "LEGACY_UPLOAD ERROR", error);
    logDoc(requestId, "LEGACY_UPLOAD END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { ok: false, error: "Failed to upload file", requestId },
      { status: 500 },
    );
  }
}
