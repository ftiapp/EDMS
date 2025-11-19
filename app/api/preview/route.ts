import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const fileUrl = searchParams.get("fileUrl");

    if (!fileUrl) {
      return NextResponse.json(
        { message: "missing fileUrl" },
        { status: 400 }
      );
    }

    const upstream = await fetch(fileUrl);
    if (!upstream.ok) {
      return NextResponse.json(
        { message: "cannot fetch upstream file" },
        { status: 502 }
      );
    }

    let contentType = upstream.headers.get("content-type") || "application/octet-stream";

    // ถ้า URL ลงท้าย .pdf ให้บังคับเป็น application/pdf เพื่อช่วยให้เบราว์เซอร์เปิด viewer ได้
    try {
      const urlObj = new URL(fileUrl);
      const pathname = urlObj.pathname.toLowerCase();
      if (pathname.endsWith(".pdf")) {
        contentType = "application/pdf";
      }
    } catch {
      // ถ้า parse URL ไม่ได้ ก็ใช้ contentType เดิมไป
    }
    const arrayBuffer = await upstream.arrayBuffer();

    return new Response(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        // บังคับให้เบราว์เซอร์พยายามแสดงผลในหน้าต่าง (เช่น PDF viewer) ไม่บังคับดาวน์โหลด
        "Content-Disposition": "inline",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Preview proxy error", error);
    return NextResponse.json(
      { message: "preview error" },
      { status: 500 }
    );
  }
}
