import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/documents?email=...&department=...
export async function GET(request: Request) {
  try {
    const db = getDb();
    const { searchParams } = new URL(request.url);
    const email = (searchParams.get("email") || "").trim();
    const department = (searchParams.get("department") || "").trim();

    let rows;
    if (!email && !department) {
      // ถ้าไม่รู้ว่า user คือใคร ให้แสดงเฉพาะเอกสาร public
      [rows] = await db.execute(
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
           AND access_level = 'public'
         ORDER BY created_at DESC, id DESC`
      );
    } else {
      [rows] = await db.execute(
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
           AND (
                 access_level = 'public'
                 OR (access_level = 'team' AND (department = ? OR owner_email = ?))
                 OR (access_level = 'private' AND owner_email = ?)
               )
         ORDER BY created_at DESC, id DESC`,
        [department || null, email || null, email || null]
      );
    }

    return NextResponse.json({ documents: rows });
  } catch (error) {
    console.error("Error fetching documents:", error);
    return NextResponse.json(
      { message: "ไม่สามารถดึงรายการเอกสารได้" },
      { status: 500 }
    );
  }
}

// PUT /api/documents?id=...
export async function PUT(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    const email = (url.searchParams.get("email") || "").trim();

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

    if (!email) {
      return NextResponse.json(
        { message: "missing email" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { title, department, tags, description, access_level } = body as {
      title?: string;
      department?: string;
      tags?: string;
      description?: string;
      access_level?: string;
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
       WHERE id = ?
         AND owner_email = ?`,
      [title, department, tags ?? null, description ?? null, access_level ?? null, id, email]
    );

    const anyResult: any = result;
    if (!anyResult || !anyResult.affectedRows) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์แก้ไขเอกสารนี้" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถบันทึกการแก้ไขเอกสารได้" },
      { status: 500 }
    );
  }
}

// DELETE /api/documents?id=...
export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const idParam = url.searchParams.get("id");
    const email = (url.searchParams.get("email") || "").trim();

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
    if (!email) {
      return NextResponse.json(
        { message: "missing email" },
        { status: 400 }
      );
    }

    const db = getDb();
    const [result] = await db.execute(
      "UPDATE edms_documents SET is_deleted = 1 WHERE id = ? AND owner_email = ?",
      [id, email]
    );

    const anyResult: any = result;
    if (!anyResult || !anyResult.affectedRows) {
      return NextResponse.json(
        { message: "คุณไม่มีสิทธิ์ลบเอกสารนี้" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, softDeleted: true });
  } catch (error) {
    console.error("Error deleting document:", error);
    return NextResponse.json(
      { message: "ไม่สามารถลบเอกสารได้" },
      { status: 500 }
    );
  }
}
