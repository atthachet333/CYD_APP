// src/lib/prisma.ts
import { PrismaClient } from "@prisma/client";

// 🟢 1. ฟังก์ชันช่วยซ่อนรหัสผ่านใน DATABASE_URL เพื่อความปลอดภัยในหน้า Log
function maskDatabaseUrl(url: string): string {
  if (!url || url === "(not set)") return url;
  try {
    // แยกส่วนประกอบของ URL เพื่อสลับรหัสผ่านเป็นตัวดอกจัน
    const parsed = new URL(url);
    if (parsed.password) {
      parsed.password = "******";
    }
    return parsed.toString();
  } catch {
    // ป้องกันกรณีที่ URL ไม่เป็นไปตามมาตรฐาน ให้สลับข้อความด้วย Regex แทน
    return url.replace(/:([^:@]+)@/, ":******@");
  }
}

// 🟢 2. ฟังก์ชันตรวจสอบสถานะและการเชื่อมต่อของฐานข้อมูลตอนเริ่มระบบ
async function runStartupDiagnostics(prismaInstance: PrismaClient) {
  const rawUrl = process.env.DATABASE_URL ?? "(not set)";
  
  console.log("\n🚀 ===================================================");
  console.log(`[env] 🛠️  NODE_ENV:      ${process.env.NODE_ENV ?? "undefined"}`);
  console.log(`[db]  🔗 DATABASE_URL:  ${maskDatabaseUrl(rawUrl)}`);
  
  try {
    // ยิงคำสั่งแบบดิบเพื่อเช็ครายละเอียดเวอร์ชันหลักและที่อยู่ของโฮสต์
    const rows = await prismaInstance.$queryRaw<any[]>`
      SELECT DATABASE() AS current_db, VERSION() AS version, @@hostname AS host
    `;
    const r = rows[0];
    
    console.log(`[db]  📦 current_db:    ${r?.current_db ?? "(null)"}`);
    console.log(`[db]  🏷️  db_version:    ${r?.version ?? "(null)"}`);
    console.log(`[db]  🖥️  db_host:       ${r?.host ?? "(null)"}`);
    console.log("🚀 ===================================================\n");
  } catch (err) {
    console.log("❌ ===================================================");
    console.error("[db]  🚨 Startup diagnostics query FAILED:", String(err));
    console.log("❌ ===================================================\n");
  }
}

// 🟢 3. จัดการ Instance ของ Prisma เพื่อป้องกันปัญหาสายการเชื่อมต่อเต็ม (Connection Pooling)
const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

// สั่งให้ตัวตรวจเช็คทำงานเฉพาะตอนที่ระบบถูกโหลดขึ้นมาครั้งแรกครั้งเดียว
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// 🚀 สั่งเรียกใช้งานตรวจสอบทันทีที่ตัวแอปเริ่มทำการดึงฐานข้อมูลเส้นนี้
runStartupDiagnostics(prisma);