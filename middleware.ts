import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const HR_LOGIN_URL = "https://employee-management-9yicp.kinsta.app/login";

// ป้องกันไม่ให้เข้าระบบ EDMS โดยพิมพ์ URL ตรงโดยไม่มีข้อมูลที่ถูกต้องจากระบบพนักงาน
export async function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const { pathname, searchParams } = url;
  const email = (searchParams.get("email") || "").trim();
  const token = (searchParams.get("token") || "").trim();

  // ยกเว้นเส้นทางที่ไม่ต้องตรวจ email
  if (
    pathname.startsWith("/admin") || // ส่วนของผู้ดูแลระบบ
    pathname.startsWith("/api") || // API ทั้งหมด
    pathname.startsWith("/_next") || // ไฟล์ระบบ Next.js
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/assets") ||
    pathname.startsWith("/public")
  ) {
    return NextResponse.next();
  }

  // ต้องมีทั้ง email และ token เสมอ
  if (!email || !token) {
    return NextResponse.redirect(HR_LOGIN_URL);
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error("NEXTAUTH_SECRET is not set");
    return NextResponse.redirect(HR_LOGIN_URL);
  }

  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secret),
      {
        issuer: "employee-management",
        algorithms: ["HS256"],
      }
    );

    // ตรวจสอบให้ email ใน query ต้องสอดคล้องกับข้อมูลจาก JWT
    // กรณีนี้ token มี username = "polawats" แต่ email ใน query เป็น "polawats@fti.or.th"
    const usernameFromToken = String(payload.username ?? "").trim();
    const emailLocalPart = email.split("@")[0]?.trim() || "";

    if (!usernameFromToken || usernameFromToken !== emailLocalPart) {
      console.error(
        "Email local-part in query does not match JWT payload.username",
        "queryEmail=",
        email,
        "emailLocalPart=",
        emailLocalPart,
        "username=",
        usernameFromToken
      );
      return NextResponse.redirect(HR_LOGIN_URL);
    }

    // ถ้าต้องการใช้ข้อมูลจาก payload ต่อ สามารถอ่านได้จากตัวแปร payload
    // เช่น payload.sub, payload.username, payload.role, ฯลฯ

    return NextResponse.next();
  } catch (err) {
    console.error("Invalid JWT from employee-management:", err);
    return NextResponse.redirect(HR_LOGIN_URL);
  }
}

// ใช้ middleware กับทุก request ที่ไม่ใช่ไฟล์ static
export const config = {
  matcher: ["/((?!.*\\.).*)"],
};