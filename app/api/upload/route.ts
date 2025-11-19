import { NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { getDb } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const files = (formData.getAll("files") as File[]).filter(Boolean);
    const title = (formData.get("title") as string | null) ?? "";
    const department = (formData.get("department") as string | null) ?? "";
    const tags = (formData.get("tags") as string | null) ?? "";
    const createdAt = (formData.get("createdAt") as string | null) ?? "";
    const shareTo = (formData.get("shareTo") as string | null) ?? "private";
    const description = (formData.get("description") as string | null) ?? "";

    if (!files || files.length === 0) {
      return NextResponse.json(
        { message: "ไม่พบไฟล์ที่อัปโหลด" },
        { status: 400 }
      );
    }

    // บันทึกข้อมูลลง MySQL
    const db = getDb();

    // ใช้ตาราง edms_documents และคอลัมน์ตามนี้:
    // id (AUTO_INCREMENT), title, department, tags, description, access_level, file_url, created_at
    const accessLevel = shareTo; // map ค่า shareTo -> access_level ตรง ๆ (private/team/public)

    // createdAt มาจาก input type=date ("YYYY-MM-DD") หรือ datetime-local ("YYYY-MM-DDTHH:mm")
    // MySQL DATETIME ต้องเป็น "YYYY-MM-DD HH:mm:ss" เลยแปลงคร่าว ๆ
    let createdAtForDb: string | null = null;
    if (createdAt) {
      if (createdAt.length === 10) {
        // กรณีได้เป็นวันที่ล้วน ๆ เช่น "2025-11-18"
        createdAtForDb = `${createdAt} 00:00:00`;
      } else {
        // กรณี datetime-local เช่น "2025-11-18T06:13"
        const replaced = createdAt.replace("T", " ");
        createdAtForDb = `${replaced}:00`;
      }
    }

    const uploadedFileUrls: string[] = [];

    for (const file of files) {
      // แยกชนิดไฟล์เบื้องต้นจากนามสกุล เพื่อเลือก resource_type ให้เหมาะสม
      const ext = file.name.split(".").pop()?.toLowerCase();
      const isDocLike = ext === "pdf" || ext === "docx";

      // แปลงไฟล์จาก FormData เป็น Buffer เพื่ออัปโหลดขึ้น Cloudinary
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const uploadResult = await new Promise<any>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: "edms-uploads",
            // ถ้าเป็น pdf/docx ให้ใช้ resource_type: "raw" สำหรับเอกสาร
            // ไฟล์อื่นใช้ auto ตามเดิม
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

    // บันทึกลงฐานข้อมูลเพียง 1 แถว โดยเก็บ file_url เป็น JSON array ของ URL ที่อัปโหลดทั้งหมด
    const sql = `
      INSERT INTO edms_documents (title, department, tags, description, access_level, file_url, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await db.execute(sql, [
      title,
      department,
      tags,
      description,
      accessLevel,
      JSON.stringify(uploadedFileUrls),
      createdAtForDb,
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
