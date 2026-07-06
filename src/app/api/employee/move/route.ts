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

  logDoc(requestId, "MOVE_EMPLOYEE START", requestHeadersForDebug(request));

  try {
    const formData = await request.formData();
    const id = formData.get("id");
    const newCompanyId = formData.get("new_company_id");

    logDoc(requestId, "form data", {
      formKeys: Array.from(formData.keys()),
      employeeId: id,
      newCompanyId,
    });

    if (!id || !newCompanyId) {
      logDoc(requestId, "MOVE_EMPLOYEE END", {
        status: 400,
        reason: "missing employee id or company id",
        durationMs: Date.now() - startedAt,
      });
      return NextResponse.json(
        { ok: false, error: "Missing employee id or company id", requestId },
        { status: 400 },
      );
    }

    const before = await prisma.employee_document_profiles.findUnique({
      where: { id: Number(id) },
    });
    logDoc(requestId, "employee before move", {
      employeeId: before?.id || null,
      company_id: before?.company_id || null,
      document_file_name: before?.document_file_name || null,
    });

    const updated = await prisma.employee_document_profiles.update({
      where: { id: Number(id) },
      data: { company_id: Number(newCompanyId) },
    });

    logDoc(requestId, "DB update result", {
      employeeId: updated.id,
      company_id: updated.company_id,
      document_file_name: updated.document_file_name,
    });
    logDoc(requestId, "MOVE_EMPLOYEE END", {
      status: 200,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ ok: true, requestId });
  } catch (error: any) {
    logDocError(requestId, "MOVE_EMPLOYEE ERROR", error);
    logDoc(requestId, "MOVE_EMPLOYEE END", {
      status: 500,
      durationMs: Date.now() - startedAt,
    });
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to move employee", requestId },
      { status: 500 },
    );
  }
}
