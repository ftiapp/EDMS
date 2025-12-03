import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const idParam = formData.get("id");
    const emailParam = formData.get("email");
    if (!idParam) {
      return NextResponse.json({ message: "missing id" }, { status: 400 });
    }
    if (!emailParam) {
      return NextResponse.json({ message: "missing email" }, { status: 400 });
    }
    const id = Number(idParam);
    const email = String(emailParam).trim();
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "invalid id" }, { status: 400 });
    }

    const files = (formData.getAll("files") as File[]).filter(Boolean);

    // รายการไฟล์เดิมที่ต้องการเก็บไว้ (จากหน้าแก้ไข)
    let existingUrls: string[] = [];
    let existingNames: string[] = [];

    const existingUrlsRaw = formData.get("existingUrls");
    const existingNamesRaw = formData.get("existingNames");

    if (existingUrlsRaw) {
      try {
        const parsed = JSON.parse(String(existingUrlsRaw));
        if (Array.isArray(parsed)) {
          existingUrls = parsed.filter((u: unknown): u is string => typeof u === "string");
        }
      } catch {
        // ignore parse error
      }
    }

    if (existingNamesRaw) {
      try {
        const parsedNames = JSON.parse(String(existingNamesRaw));
        if (Array.isArray(parsedNames)) {
          existingNames = parsedNames.filter(
            (n: unknown): n is string => typeof n === "string"
          );
        }
      } catch {
        // ignore
      }
    }

    const uploadedFileUrls: string[] = [];
    const originalNames: string[] = [];

    for (const file of files) {
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isDocLike = ext === "pdf" || ext === "docx";

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const timestamp = Date.now();
      const randomStr = Math.random().toString(36).substring(2, 15);
      const publicId = `${timestamp}_${randomStr}`;

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "edms-uploads",
            resource_type: isDocLike ? "raw" : "auto",
            type: "upload",
            access_mode: "public",
            public_id: ext ? `${publicId}.${ext}` : publicId,
            format: ext,
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

      // ถ้าเป็น PDF ให้อัปโหลด preview เป็นรูปเหมือนตอนสร้างเอกสารใหม่
      if (ext === "pdf") {
        try {
          await new Promise<any>((resolve, reject) => {
            const previewStream = cloudinary.uploader.upload_stream(
              {
                folder: "edms-uploads",
                resource_type: "image",
                type: "upload",
                access_mode: "public",
                public_id: `${publicId}_preview`,
                format: "jpg",
                pages: true,
              },
              (error, result) => {
                if (error) {
                  console.error("Preview upload error (update-files):", error);
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
            previewStream.end(buffer);
          });
        } catch (previewError) {
          console.error("Failed to create PDF preview on update:", previewError);
        }
      }

      const fileUrl: string = uploadResult.secure_url;
      uploadedFileUrls.push(fileUrl);
      originalNames.push(file.name);
    }

    // รวมไฟล์เดิมที่ยังเก็บไว้กับไฟล์ใหม่
    const finalUrls = [...existingUrls, ...uploadedFileUrls];
    const finalNames = [...existingNames, ...originalNames];

    const db = getDb();
    const [result] = await db.execute(
      "UPDATE edms_documents SET file_url = ?, original_filenames = ? WHERE id = ? AND owner_email = ?",
      [JSON.stringify(finalUrls), JSON.stringify(finalNames), id, email]
    );

    const anyResult: any = result;
    if (!anyResult || !anyResult.affectedRows) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์แก้ไขไฟล์ของเอกสารนี้" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      fileUrls: finalUrls,
      count: finalUrls.length,
    });
  } catch (error) {
    console.error("Update files error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดระหว่างการอัปเดตไฟล์แนบ" },
      { status: 500 }
    );
  }
}
