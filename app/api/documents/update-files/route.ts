import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const idParam = formData.get("id");
    if (!idParam) {
      return NextResponse.json({ message: "missing id" }, { status: 400 });
    }
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "invalid id" }, { status: 400 });
    }

    const files = (formData.getAll("files") as File[]).filter(Boolean);
    if (!files || files.length === 0) {
      return NextResponse.json({ message: "ไม่พบไฟล์ใหม่สำหรับอัปเดต" }, { status: 400 });
    }

    const uploadedFileUrls: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isDocLike = ext === "pdf" || ext === "docx";

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "edms-uploads",
            resource_type: isDocLike ? "raw" : "auto",
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          }
        );

        uploadStream.end(buffer);
      });

      const fileUrl: string = uploadResult.secure_url;
      uploadedFileUrls.push(fileUrl);
    }

    const db = getDb();
    await db.execute(
      "UPDATE edms_documents SET file_url = ? WHERE id = ?",
      [JSON.stringify(uploadedFileUrls), id]
    );

    return NextResponse.json({
      success: true,
      fileUrls: uploadedFileUrls,
      count: uploadedFileUrls.length,
    });
  } catch (error) {
    console.error("Update files error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดระหว่างการอัปเดตไฟล์แนบ" },
      { status: 500 }
    );
  }
}
