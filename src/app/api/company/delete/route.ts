import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const id = formData.get("id");

    if (!id) {
      return NextResponse.json({ ok: false, error: "Missing company id" }, { status: 400 });
    }

    const companyId = Number(id);
    const empCount = await prisma.employee_document_profiles.count({
      where: { company_id: companyId },
    });

    if (empCount > 0) {
      return NextResponse.json(
        { ok: false, error: "Company still has employees" },
        { status: 400 },
      );
    }

    await prisma.companies.delete({ where: { id: companyId } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("[API_DELETE_COMPANY] error:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "Failed to delete company" },
      { status: 500 },
    );
  }
}
