// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma"; 
import bcrypt from "bcrypt";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await prisma.users.findUnique({
          where: { username: credentials.username },
          include: { roles: true } 
        });

        if (!user) return null;

        // 🟢 เพิ่มเงื่อนไขพิเศษตรงนี้: ถ้าเป็น admin ให้ใช้รหัส admin1234 ผ่านเข้าหน้าบ้านได้เลย โดยไม่ยุ่งกับ Database
        if (user.username === "admin" && credentials.password === "admin1234") {
            return { 
              id: user.id.toString(),
              name: user.full_name || user.username, 
              role: user.roles?.name || "CUSTOMER", 
              companyId: user.company_id,
              username: user.username
            };
        }

        // สำหรับบัญชีอื่นๆ (เช่น amcyd, newcyd) ตรวจสอบรหัสผ่านตามปกติในฐานข้อมูล
        const isPasswordValid = await bcrypt.compare(credentials.password, user.password_hash);
        
        if (!isPasswordValid) return null;

        return { 
          id: user.id.toString(),
          // 🟢 แก้บั๊กตรงนี้! เปลี่ยนจาก user.name เป็น user.full_name 
          name: user.full_name || user.username, 
          role: user.roles?.name || "CUSTOMER", 
          companyId: user.company_id,
          username: user.username
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id;
        token.role = (user as any).role;
        token.companyId = (user as any).companyId;
        token.username = (user as any).username;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
        (session.user as any).companyId = token.companyId;
        (session.user as any).username = token.username;
      }
      return session;
    }
  },
  pages: {
    signIn: "/login",
  },
  session: { strategy: "jwt" }
});  

export { handler as GET, handler as POST };