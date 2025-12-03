import { NextResponse } from "next/server";
import { getDepartmentByEmail } from "@/lib/employeeDb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { message: "missing email" },
        { status: 400 }
      );
    }

    const result = await getDepartmentByEmail(email);

    if (!result) {
      return NextResponse.json(
        { message: "employee not found", email },
        { status: 404 }
      );
    }

    return NextResponse.json({
      employeeId: result.employeeId,
      email: result.email,
      departmentId: result.departmentId,
      departmentName: result.departmentName,
      departmentCode: result.departmentCode,
      departmentNameEn: result.departmentNameEn,
    });
  } catch (error) {
    console.error("Error fetching department by email", error);
    return NextResponse.json(
      { message: "internal error" },
      { status: 500 }
    );
  }
}
