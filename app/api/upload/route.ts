import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";
import { getDepartmentByEmail } from "@/lib/employeeDb";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const files = (formData.getAll("files") as File[]).filter(Boolean);
    const title = (formData.get("title") as string | null) ?? "";
    let department = (formData.get("department") as string | null) ?? "";
    const tags = (formData.get("tags") as string | null) ?? "";
    const shareTo = (formData.get("shareTo") as string | null) ?? "private";
    const description = (formData.get("description") as string | null) ?? "";
    const email = (formData.get("email") as string | null) ?? "";

    // ถ้ามีอีเมลจากระบบ HR ให้พยายามดึงฝ่ายจากฐาน employee-portal มาใช้แทนค่า department ที่ส่งมาจากฟอร์ม
    if (email) {
      try {
        const empDept = await getDepartmentByEmail(email);
        if (empDept) {
          department =
            empDept.departmentName ??
            empDept.departmentNameEn ??
            empDept.departmentCode ??
            department;
        }
      } catch (err) {
        console.error("Failed to resolve department from HR by email", err);
      }
    }

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: "ไม่พบไฟล์ที่อัปโหลด" },
        { status: 400 }
      );
    }

    const db = getDb();
    const accessLevel = shareTo;

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

      // 1. อัปโหลดไฟล์ต้นฉบับ (PDF, DOCX, หรือรูปภาพ)
      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "edms-uploads",
            resource_type: isDocLike ? "raw" : "auto",
            type: "upload",
            access_mode: "public",
            public_id: `${publicId}.${ext}`,
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

      // 2. ถ้าเป็น PDF ให้อัปโหลดอีกครั้งเป็นรูปภาพ preview
      if (ext === "pdf") {
        try {
          await new Promise<any>((resolve, reject) => {
            const previewStream = cloudinary.uploader.upload_stream(
              {
                folder: "edms-uploads",
                resource_type: "image", // อัปโหลดเป็นรูปภาพ
                type: "upload",
                access_mode: "public",
                public_id: `${publicId}_preview`, // ชื่อไฟล์ preview
                format: "jpg", // แปลงเป็น JPG
                pages: true, // รองรับหลายหน้า
              },
              (error, result) => {
                if (error) {
                  console.error("Preview upload error:", error);
                  reject(error);
                } else {
                  resolve(result);
                }
              }
            );
            previewStream.end(buffer);
          });
        } catch (previewError) {
          console.error("Failed to create PDF preview:", previewError);
          // ถ้า preview ล้มเหลว ก็ไม่เป็นไร ยังมีไฟล์ต้นฉบับอยู่
        }
      }

      const fileUrl: string = uploadResult.secure_url;
      uploadedFileUrls.push(fileUrl);
      originalNames.push(file.name);
    }

    const sql = `
      INSERT INTO edms_documents (
        title,
        department,
        owner_email,
        tags,
        description,
        access_level,
        file_url,
        original_filenames,
        created_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `;

    await db.execute(sql, [
      title,
      department,
      email || null,
      tags,
      description,
      accessLevel,
      JSON.stringify(uploadedFileUrls),
      JSON.stringify(originalNames),
    ]);

    return NextResponse.json({
      message: "อัปโหลดเอกสารและบันทึกข้อมูลเรียบร้อยแล้ว",
      fileUrls: uploadedFileUrls,
      count: uploadedFileUrls.length,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { message: "เกิดข้อผิดพลาดระหว่างการอัปโหลดเอกสาร" },
      { status: 500 }
    );
  }
}