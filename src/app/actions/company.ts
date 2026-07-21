"use server";

import { prisma } from "@/lib/prisma";

export async function createCompanyAction(companyName: string) {
  if (!companyName || !companyName.trim()) {
    return { error: "กรุณากรอกชื่อบริษัท" };
  }

  const name = companyName.trim();

  try {
    // Check if company already exists
    const existing = await prisma.companies.findFirst({
      where: { company_name: name },
    });

    if (existing) {
      return { company: existing };
    }

    // Create new company
    const newCompany = await prisma.companies.create({
      data: { company_name: name },
    });

    return { company: newCompany };
  } catch (error) {
    console.error("[CREATE_COMPANY_ACTION]", error);
    return { error: "เกิดข้อผิดพลาดในการบันทึกบริษัท" };
  }
}
