import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/admin/documents
// ดึงเอกสารทั้งหมด (ยกเว้นที่ถูกลบ) สำหรับแดชบอร์ดผู้ดูแลระบบ
export async function GET() {
  try {
    const db = getDb();
    const [rows] = await db.execute(
      `SELECT id,
              title,
              department,
              owner_email,
              tags,
              description,
              access_level,
              file_url,
              original_filenames,
              created_at,
              edited_at
       FROM edms_documents
       WHERE is_deleted = 0
       ORDER BY created_at DESC, id DESC`
    );

    return NextResponse.json({ documents: rows });
  } catch (error) {
    console.error("Error fetching admin documents:", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงรายการเอกสารสำหรับผู้ดูแลระบบได้" },
      { status: 500 }
    );
  }
}

// PUT /api/admin/documents?id=...
// แก้ไขเอกสารสำหรับผู้ดูแลระบบ ไม่ตรวจ owner_email
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ message: "missing id" }, { status: 400 });
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ message: "invalid id" }, { status: 400 });
    }

    const body = await request.json();
    const { title, department, tags, description, access_level } = body as {
      title?: string;
      department?: string;
      tags?: string | null;
      description?: string | null;
      access_level?: string | null;
    };

    if (!title || !department) {
      return NextResponse.json(
        { message: "missing required fields" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [result] = await db.execute(
      `UPDATE edms_documents
       SET title = ?,
           department = ?,
           tags = ?,
           description = ?,
           access_level = COALESCE(?, access_level),
           edited_at = NOW()
       WHERE id = ?`,
      [title, department, tags ?? null, description ?? null, access_level ?? null, id]
    );

    const anyResult: any = result;
    if (!anyResult || !anyResult.affectedRows) {
      return NextResponse.json(
        { message: "ไม่พบเอกสารสำหรับแก้ไข" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating admin document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถบันทึกการแก้ไขเอกสารสำหรับผู้ดูแลระบบได้" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/documents?id=...
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");

    if (!idParam) {
      return NextResponse.json(
        { message: "missing id" },
        { status: 400 }
      );
    }

    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      return NextResponse.json(
        { message: "invalid id" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [result] = await db.execute(
      "UPDATE edms_documents SET is_deleted = 1 WHERE id = ?",
      [id]
    );

    const anyResult: any = result;
    if (!anyResult || !anyResult.affectedRows) {
      return NextResponse.json(
        { message: "ไม่พบเอกสารสำหรับลบ" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, softDeleted: true });
  } catch (error) {
    console.error("Error deleting admin document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบเอกสารสำหรับผู้ดูแลระบบได้" },
      { status: 500 }
    );
  }
}
