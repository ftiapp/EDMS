import { NextResponse } from "next/server";

export const runtime = "nodejs";

// NOTE: ต้องติดตั้ง jszip ก่อนใช้งาน: npm install jszip
import JSZip from "jszip";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrlsParam = searchParams.get("fileUrls");
    const title = searchParams.get("title") || "document";

    if (!fileUrlsParam) {
      return NextResponse.json(
        { message: "ไม่พบข้อมูลไฟล์แนบสำหรับดาวน์โหลด" },
        { status: 400 }
      );
    }

    let fileUrls: string[] = [];
    try {
      const parsed = JSON.parse(fileUrlsParam);
      if (Array.isArray(parsed)) {
        fileUrls = parsed.filter((u) => typeof u === "string" && u.length > 0);
      }
    } catch {
      // ถ้า parse ไม่ได้ ให้ถือว่าเป็น URL เดี่ยวที่ส่งมาเป็น string
      fileUrls = [fileUrlsParam];
    }

    if (fileUrls.length === 0) {
      return NextResponse.json(
        { message: "ไม่มีไฟล์แนบสำหรับดาวน์โหลด" },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    for (let index = 0; index < fileUrls.length; index++) {
      const url = fileUrls[index];

      const res = await fetch(url);
      if (!res.ok) {
        continue;
      }
      const arrayBuffer = await res.arrayBuffer();

      // ตั้งชื่อไฟล์ตามลำดับ เพื่อให้แยกได้ว่าไฟล์ไหนเป็นไฟล์ที่เท่าไร
      const urlPath = new URL(url).pathname;
      const originalName = urlPath.split("/").pop() || `file-${index + 1}`;
      const fileName = `${title}-ไฟล์ที่-${index + 1}-${originalName}`;

      zip.file(fileName, arrayBuffer);
    }

    const zipArrayBuffer = await zip.generateAsync({ type: "arraybuffer" });

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set(
      "Content-Disposition",
      `attachment; filename="${encodeURIComponent(title)}.zip"`
    );

    return new Response(zipArrayBuffer, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Error creating zip:", error);
    return NextResponse.json(
      { message: "ไม่สามารถสร้างไฟล์ ZIP สำหรับดาวน์โหลดได้" },
      { status: 500 }
    );
  }
}
