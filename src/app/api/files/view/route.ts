import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await getServerSession();
    
    // 1. เช็คว่าล็อกอินหรือยัง (ใช้ username หรือ email ที่ NextAuth ส่งมา)
    if (!session || !session.user?.name) {
      return new NextResponse("กรุณาเข้าสู่ระบบ", { status: 401 });
    }

    // 2. วิ่งไปเช็ค Role ใน Database ให้ชัวร์ 100%
    const user = await prisma.users.findUnique({
      where: { username: session.user.name },
      include: { roles: true }
    });

    const roleName = user?.roles?.name?.toUpperCase();

    // 3. ถ้าไม่ใช่ ADMIN และ STAFF ให้เตะออกทันที
    if (roleName !== "ADMIN" && roleName !== "STAFF") {
      return new NextResponse("Access Denied: คุณไม่มีสิทธิ์เข้าถึงเอกสารนี้", { status: 403 });
    }

    // 4. รับชื่อไฟล์และเปิดไฟล์ให้ดู
    const { searchParams } = new URL(request.url);
    const fileName = searchParams.get("file");

    if (!fileName) return new NextResponse("ไม่พบชื่อไฟล์", { status: 400 });

    const safeFileName = path.basename(fileName);
    const filePath = path.join(process.cwd(), "private_uploads", safeFileName);

    if (!fs.existsSync(filePath)) {
      return new NextResponse("ไม่พบไฟล์ในระบบ", { status: 404 });
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // ตั้งค่าประเภทไฟล์
    const ext = path.extname(safeFileName).toLowerCase();
    let contentType = "application/octet-stream";
    if (ext === ".pdf") contentType = "application/pdf";
    else if (ext === ".png") contentType = "image/png";
    else if (ext === ".jpg" || ext === ".jpeg") contentType = "image/jpeg";

    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${encodeURIComponent(safeFileName)}"`,
      },
    });

  } catch (error) {
    console.error("File View Error:", error);
    return new NextResponse("ระบบขัดข้อง", { status: 500 });
  }
}