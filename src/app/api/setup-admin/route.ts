import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt"; 

export async function GET() {
  try {
    // 1. สร้าง Role
    let role = await prisma.roles.findFirst({ where: { name: "ADMIN" } });
    if (!role) {
      role = await prisma.roles.create({
        data: { 
          name: "ADMIN", 
          label: "ผู้ดูแลระบบ",
          permissions: "ALL" 
        }
      });
    }

    // 2. เข้ารหัสรหัสผ่าน
    const newHash = await bcrypt.hash("123456", 10);

    // 3. สร้างบัญชี admin
    const upsertedUser = await prisma.users.upsert({
      where: { username: "admin" },
      update: {
        password_hash: newHash,
        is_active: true, // 🟢 เปลี่ยนจาก 1 เป็น true
        role_id: role.id
      },
      create: {
        username: "admin",
        email: "admin@cyd.com",
        full_name: "ผู้ดูแลระบบสูงสุด",
        password_hash: newHash,
        is_active: true, // 🟢 เปลี่ยนจาก 1 เป็น true
        role_id: role.id
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: "✅ สร้างบัญชี admin ใหม่เรียบร้อยแล้ว! รหัสผ่านคือ 123456", 
      userData: upsertedUser 
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message });
  }
}