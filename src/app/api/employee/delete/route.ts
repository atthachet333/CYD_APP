import path from "path";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  createRequestId,
  logDoc,
  logDocError,
  requestHeadersForDebug,
} from "@/lib/docDebug";

export async function POST(request: Request) {
  const requestId = createRequestId();
  const startedAt = Date.now();

  logDoc(requestId, "DELETE_EMPLOYEE START", requestHeadersForDebug(request));

  try {
    const formData = await request.formData();
    const id = formData.get("id");
    logDoc(requestId, "form data", {
      formKeys: Array.from(formData.keys()),
      employeeId: id,
    });

    if (!id) {
      logDoc(requestId, "DELETE_EMPLOYEE END", {
        status: 400,
        reason: "missing employee id",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Missing employee id", requestId },
        { status: 400 },
      );
    }

    const employee = await prisma.employee_document_profiles.findUnique({
      where: { id: Number(id) },
    });

    logDoc(requestId, "employee before delete", {
      employeeId: employee?.id || null,
      document_file_name: employee?.document_file_name || null,
      documentPath: employee?.document_file_name
        ? path.join(process.cwd(), "private_uploads", employee.document_file_name)
        : null,
      note: "delete employee only removes DB record, does not delete physical document file",
    });

    const deleted = await prisma.employee_document_profiles.delete({
      where: { id: Number(id) },
    });

    logDoc(requestId, "DB delete result", {
      employeeId: deleted.id,
      document_file_name: deleted.document_file_name,
    });
    logDoc(requestId, "DELETE_EMPLOYEE END", {
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ ok: true, requestId });
  } catch (error: any) {
    logDocError(requestId, "DELETE_EMPLOYEE ERROR", error);
    logDoc(requestId, "DELETE_EMPLOYEE END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to delete employee", requestId },
      { status: 500 },
    );
  }
}
