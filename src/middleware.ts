// src/middleware.ts
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const path = req.nextUrl.pathname;
    const role = String(token?.role || "").toUpperCase();
    const internalRoles = ["ADMIN", "STAFF", "SUPERADMIN"];
    const isInternal = internalRoles.includes(role);

    if (path === "/dashboard" && role === "CUSTOMER") {
      return NextResponse.redirect(new URL("/company-dashboard", req.url));
    }

    if (path.startsWith("/admin") && !isInternal) {
      if (role === "CUSTOMER") {
        return NextResponse.redirect(new URL("/company-dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    const staffOnlyPaths = ["/employees", "/employee-doc-approvals", "/ninety-day-renewal", "/passport-renewal", "/visa-renewal", "/work-permit-renewal"];
    if (!isInternal && staffOnlyPaths.some(p => path.startsWith(p))) {
      return NextResponse.redirect(new URL("/company-dashboard", req.url));
    }
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = { 
  matcher: [
    "/admin/:path*", 
    "/dashboard", 
    "/company-dashboard", 
    "/employees", 
    "/employee-doc-approvals",
    "/ninety-day-renewal",
    "/passport-renewal",
    "/visa-renewal",
    "/work-permit-renewal"
  ] 
};
