// src/app/dashboard/page.tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./DashboardClient";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // 🟢 1. ดึงข้อมูล User จากฐานข้อมูลด้วยเงื่อนไขที่ครอบคลุม (ป้องกันสิทธิ์หลุดสำหรับ Admin)
  const sessionName = session.user?.name || "";
  const sessionEmail = session.user?.email || "";
  const sessionUsername = (session.user as any)?.username || "";

  let dbUser = null;
  try {
    dbUser = await prisma.users.findFirst({
      where: {
        OR: [
          { username: sessionUsername },
          { email: sessionEmail },
          { full_name: sessionName }
        ]
      },
      include: { roles: true }
    });
  } catch (error) {
    console.log("Prisma Error:", error);
  }

  // 2. เช็คสิทธิ์การเข้าถึงข้อมูล (ปลดล็อกให้ ADMIN และ STAFF)
  const sessionRole = String((session?.user as any)?.role || "").trim().toUpperCase();
  const dbRole = String(dbUser?.roles?.name || "").trim().toUpperCase();
  const safeLoginName = String(session?.user?.name || "").trim().toLowerCase();
  const safeEmail = String(session?.user?.email || "").trim().toLowerCase();

  const isInternal = 
    sessionRole === "ADMIN" || 
    sessionRole === "STAFF" || 
    dbRole === "ADMIN" || 
    dbRole === "STAFF" || 
    safeLoginName === "admin" ||
    safeLoginName.includes("cyd") || 
    safeEmail.startsWith("admin");

  const userCompanyId = dbUser?.company_id || (session.user as any)?.companyId || null;
  const companyFilter = isInternal ? {} : { company_id: userCompanyId ? Number(userCompanyId) : -1 };

  // 3. ดึงข้อมูลพนักงานทั้งหมดตามสิทธิ์
  const rawEmployeesData = await prisma.employee_document_profiles.findMany({
    where: companyFilter,
    orderBy: { created_at: "desc" }
  });

  // 4. ตรรกะคัดกรองแถวว่างเปล่าทิ้ง (Aggressive Deduplication)
  const uniqueEmployeesMap = new Map();
  
  rawEmployeesData.forEach((emp: any) => {
    const fname = String(emp.first_name_th || emp.first_name || "").replace(/\s+/g, "").toLowerCase();
    const lname = String(emp.last_name_th || emp.last_name || "").replace(/\s+/g, "").toLowerCase();
    const passport = String(emp.passport_no || "").replace(/\s+/g, "").toLowerCase();
    const code = String(emp.emp_code || "").replace(/\s+/g, "").toLowerCase();

    if (!fname && !lname && !passport && !code) return;

    let key = "";
    if (fname && lname && fname !== "-" && lname !== "-") {
      key = `NAME_${fname}_${lname}`;
    } else if (passport && passport !== "-" && passport !== "n/a") {
      key = `PP_${passport}`;
    } else if (code && code !== "-" && code !== "n/a") {
      key = `CODE_${code}`;
    } else {
      key = `ID_${emp.id}`;
    }

    if (!uniqueEmployeesMap.has(key)) {
      uniqueEmployeesMap.set(key, emp);
    }
  });
  
  const uniqueEmployeesData = Array.from(uniqueEmployeesMap.values());

  // 5. ดึงข้อมูลอื่นๆ ในระบบเพื่อไปแสดงผลภาพรวม
  const users = await prisma.users.findMany({
    include: { roles: true }
  });

  const companies = await prisma.companies.findMany();
  let uploads: any[] = [];

  // 🟢 สร้างตัวแมปชื่อบริษัทเพื่อป้องกันคอลัมน์บริษัทว่างเปล่า
  const companyMap = new Map(companies.map(c => [c.id, c.company_name]));

  // 6. ส่งยอดรวมที่คลีนแล้วไปยังการ์ดสถิติ
  const statsData = {
    totalEmployees: uniqueEmployeesData.length,
    totalUsers: users.length,
    totalCompanies: companies.length,
    totalUploads: uploads.length || 0 
  };

  const usersData = users.map((u: any) => ({
    full_name: u.full_name || u.username || "ไม่ระบุชื่อ",
    username: u.username || u.email || "-",
    roleName: u.roles?.name || "CUSTOMER"
  }));

  const companiesData = companies.map((c: any) => ({
    id: c.id,
    company_name: c.company_name || "ไม่ระบุชื่อบริษัท"
  }));

  // 🟢 ส่งรายชื่อ 10 คนแรกไปที่ตาราง (แก้ไขชื่อคอลัมน์วันหมดอายุให้ตรงกับโครงสร้างจริง)
  const employeesData = uniqueEmployeesData.slice(0, 10).map((emp: any) => ({
    empCode: emp.emp_code || "N/A",
    name: `${emp.first_name_th || emp.first_name || ""} ${emp.last_name_th || emp.last_name || ""}`.trim() || "-",
    company: companyMap.get(emp.company_id) || "-",
    passport: emp.passport_no || "-",
    visaExp: emp.visa_expiry_date ? new Date(emp.visa_expiry_date).toLocaleDateString("th-TH") : "-",
    wpExp: emp.work_permit_expiry_date ? new Date(emp.work_permit_expiry_date).toLocaleDateString("th-TH") : "-",
    ninetyExp: emp.ninety_day_report_date ? new Date(emp.ninety_day_report_date).toLocaleDateString("th-TH") : "-",
    exp: emp.passport_expiry_date ? new Date(emp.passport_expiry_date).toLocaleDateString("th-TH") : "-"
  }));

  const uploadsData = uploads.map((up: any) => ({
    file: up.file_name || "Document",
    category: up.category || "ทั่วไป",
    date: up.created_at ? new Date(up.created_at).toLocaleDateString("th-TH") : "-"
  }));

  // 🟢 คำนวณข้อมูลกราฟแท่งแยกตามบริษัทจริง
  const companyCounts: Record<string, number> = {};
  uniqueEmployeesData.forEach((emp: any) => {
    const cName = companyMap.get(emp.company_id) || "ไม่ระบุสาขา";
    companyCounts[cName] = (companyCounts[cName] || 0) + 1;
  });

  const chartData = Object.entries(companyCounts).map(([name, count]) => ({
    company_name: name,
    count: count
  }));

  return (
    <DashboardClient
      statsData={statsData}
      usersData={usersData}
      companiesData={companiesData}
      employeesData={employeesData}
      uploadsData={uploadsData}
      fullName={dbUser?.full_name || session.user?.name || "ผู้ใช้งาน"}
      chartData={chartData}
    />
  );
}