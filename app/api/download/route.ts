import { NextResponse } from "next/server";

export const runtime = "nodejs";

// GET /api/download?fileUrl=...&filename=...
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get("fileUrl");
    const filenameParam = searchParams.get("filename") || "document";

    if (!fileUrl) {
      return NextResponse.json(
        { message: "ไม่พบ URL ของไฟล์ที่ต้องการดาวน์โหลด" },
        { status: 400 }
      );
    }

    const upstreamRes = await fetch(fileUrl);

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { message: "ไม่สามารถดึงไฟล์จาก Cloudinary ได้" },
        { status: upstreamRes.status }
      );
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    const contentType =
      upstreamRes.headers.get("content-type") || "application/octet-stream";

    // ทำชื่อไฟล์ให้ปลอดภัย (ตัดตัวอักษรแปลก ๆ)
    const baseName =
      filenameParam.replace(/[^\wก-๙ ._-]/g, "").trim() || "document";

    // พยายามดึงนามสกุลไฟล์จาก URL เดิมของ Cloudinary
    let downloadName = baseName;
    try {
      const urlObj = new URL(fileUrl);
      const pathname = urlObj.pathname; // เช่น /.../edms-uploads/xxx.pdf
      const lastSegment = pathname.substring(pathname.lastIndexOf("/") + 1);
      const dotIndex = lastSegment.lastIndexOf(".");
      if (dotIndex !== -1 && dotIndex < lastSegment.length - 1) {
        const ext = lastSegment.substring(dotIndex + 1); // pdf, docx, jpg
        if (ext.length <= 10) {
          downloadName = `${baseName}.${ext}`;
        }
      }
    } catch {
      // ถ้าดึงนามสกุลจาก URL ไม่ได้ ให้ใช้ baseName ตามเดิม
    }

    return new NextResponse(arrayBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${encodeURIComponent(
          downloadName
        )}"`,
      },
    });
  } catch (error) {
    console.error("Download error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดระหว่างการดาวน์โหลดไฟล์" },
      { status: 500 }
    );
  }
}
