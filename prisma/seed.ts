import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  console.log('⏳ กำลังจัดระเบียบโครงสร้างสิทธิ์ผู้ใช้งาน...');

  const rolesData = [
    { name: 'ADMIN', label: 'ผู้ดูแลระบบ', permissions: 'ALL' },
    { name: 'STAFF', label: 'พนักงาน', permissions: 'MANAGE_DOCS' },
    { name: 'CUSTOMER', label: 'ลูกค้า', permissions: 'VIEW_ONLY' }
  ]

  for (const r of rolesData) {
    await prisma.roles.upsert({
      where: { name: r.name },
      update: { label: r.label, permissions: r.permissions },
      create: r
    })
  }

  console.log('👥 กำลังนำเข้าข้อมูลผู้ใช้งานจากฐานข้อมูลเดิม...');

  const adminRole = await prisma.roles.findUnique({ where: { name: 'ADMIN' } });
  const staffRole = await prisma.roles.findUnique({ where: { name: 'STAFF' } });
  const customerRole = await prisma.roles.findUnique({ where: { name: 'CUSTOMER' } });

  // ข้อมูล Users จากระบบเดิม
  const realUsers = [
    // --- พนักงาน (ADMIN & STAFF) ---
    { role_id: 1, full_name: 'Admin CHAIYADETPROGRESS', username: 'admin', email: 'admin@chaiyadetprogress.org', company_id: null },
    { role_id: 1, full_name: 'new', username: 'newcyd', email: 'newpanu42@gmail.com', company_id: null },
    { role_id: 1, full_name: 'hnung', username: 'hnungcyd', email: 'hsawinee@gmail.com', company_id: null },
    { role_id: 2, full_name: 'ann', username: 'ancyd', email: 'sutthinan51@gmail.com', company_id: null },
    { role_id: 2, full_name: 'am', username: 'ang_cyd', email: 'angkanacyd@gmail.com', company_id: null },
    { role_id: 2, full_name: 'am', username: 'amcyd', email: 'amcha88828@gmail.com', company_id: null },
    { role_id: 2, full_name: 'Nk', username: 'nkcyd', email: 'khanittha.n3333@gmail.com', company_id: null },
    { role_id: 2, full_name: 'am', username: 'angcyd', email: 'angkananuamjoem@gmail.com', company_id: null },
    { role_id: 2, full_name: 'wi', username: 'wicyd', email: 'wicyd@gmail.com', company_id: null },
    { role_id: 2, full_name: 'kim', username: 'kimcyd', email: 'kimcyd@gmail.com', company_id: null },
    
    // --- ลูกค้า (CUSTOMER) ---
 { role_id: 3, full_name: 'บริษัท SYAQUA SIAM COMPANY LIMITED', username: 'SYAQUA ', email: 'ccvvcaouts@gmail.com', company_id: 18 },
    { role_id: 3, full_name: 'บริษัท วิพล พาราไดซ์ จำกัด', username: 'amc', email: 'amcha8d8828@gmail.com', company_id: 16 },
    { role_id: 3, full_name: 'บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส จำกัด (HUB)', username: 'SPXadmin', email: '12758thiraphat@gmail.com', company_id: 38 },
    { role_id: 3, full_name: 'บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส จำกัด (FSOCW-สมุทรสาคร)', username: 'SPXadmin01', email: 'SPXadmin01@gmail.com', company_id: 37 },
    { role_id: 3, full_name: 'บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส จำกัด (SOCE-บัวโรย)', username: 'SPXadmin02', email: 'SPXadmin02@gmail.com', company_id: 39 },
    { role_id: 3, full_name: 'บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส จำกัด (SOCN-วังน้อย)', username: 'SPXadmin03', email: 'SPXadmin03@gmail.com', company_id: 40 },
    { role_id: 3, full_name: 'บริษัท เอสพีเอ็กซ์ เอ็กซ์เพรส จำกัด (SOCW-สมุทรสาคร)', username: 'SPXadmin04', email: 'SPXadmin04@gmail.com', company_id: 41 },
    { role_id: 3, full_name: 'บริษัท แม่น้ำสแตนเลสไวร์ จำกัด (มหาชน)', username: 'mswadmin02', email: 'mswadmin02@gmail.com', company_id: 21 },
  ];

  for (const u of realUsers) {
    const assignedRoleId = u.role_id === 1 ? adminRole?.id : (u.role_id === 2 ? staffRole?.id : customerRole?.id);

    // สร้างข้อมูลบริษัทถ้ามี
    if (u.company_id) {
      await prisma.companies.upsert({
        where: { id: u.company_id },
        update: { company_name: u.full_name },
        create: { id: u.company_id, company_name: u.full_name }
      });
    }

    // 🔑 แมปรหัสผ่านดิบ (Plaintext) ที่ได้มาจากรูป
    let plainPassword = "cyd123456"; // รหัสผ่านสำรองสำหรับคนที่ไม่มีในรูป
    
    // พนักงาน
    if (u.username === "newcyd") plainPassword = "cyd42";
    else if (u.username === "amcyd") plainPassword = "cyd888";
    else if (u.username === "angcyd" || u.username === "ang_cyd") plainPassword = "1234";
    else if (u.username === "nkcyd") plainPassword = "n3333";
    else if (u.username === "ancyd") plainPassword = "cyd51";
    else if (u.username === "hnungcyd") plainPassword = "hnung3";
    else if (u.username === "wicyd") plainPassword = "cyd666";
    else if (u.username === "kimcyd") plainPassword = "cyd777";
    
    // ลูกค้า
    else if (["SYAQUA ", "amc", "SPXadmin", "SPXadmin01", "SPXadmin02", "SPXadmin03", "SPXadmin04" ,"mswadmin02"].includes(u.username)) {
      plainPassword = "amc";
    }

    // ทำการ Hash รหัสผ่านจริง แล้วบันทึกลง Database
    const newHashedPassword = await bcrypt.hash(plainPassword, 10);

    await prisma.users.upsert({
      where: { username: u.username },
      update: { password_hash: newHashedPassword, role_id: assignedRoleId, company_id: u.company_id },
      create: {
        username: u.username,
        email: u.email,
        full_name: u.full_name,
        password_hash: newHashedPassword,
        role_id: assignedRoleId,
        company_id: u.company_id,
        is_active: true
      }
    });
  }

  console.log('🎉 อัปเดตผู้ใช้งานพร้อมรหัสผ่านจริงเสร็จสมบูรณ์!');
}

main().catch((e) => console.error(e)).finally(async () => await prisma.$disconnect())