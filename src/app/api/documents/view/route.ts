// app/api/documents/view/route.ts
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(request: NextRequest) {
  // 1. รับค่าประเภทเอกสาร และ รหัสพนักงาน จาก Query String
  const searchParams = request.nextUrl.searchParams;
  const docType = searchParams.get('type'); // เช่น VS, PP, 90D
  const empId = searchParams.get('empId');   // เช่น 66001

  if (!docType || !empId) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // TODO: แทรกโค้ดเช็คสิทธิ์ (Authentication) ตรงนี้ ว่า User คนนี้มีสิทธิ์ดูไฟล์หรือไม่
  // ...

  // 2. สร้าง Path ไปยังไฟล์ที่เก็บไว้
  // โครงสร้าง: private_uploads / ประเภทเอกสาร / รหัสพนักงาน.pdf
  const filePath = path.join(process.cwd(), 'private_uploads', docType, `${empId}.pdf`);

  // 3. ตรวจสอบว่ามีไฟล์อยู่จริงไหม
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }

  // 4. อ่านไฟล์และส่งกลับไปเป็น Buffer
  const fileBuffer = fs.readFileSync(filePath);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': 'application/pdf',
      // ป้องกันการ Cache เพื่อความปลอดภัย
      'Cache-Control': 'no-store, max-age=0', 
    },
  });
}