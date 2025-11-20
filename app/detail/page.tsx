"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type DbDocument = {
  id: number;
  title: string;
  department: string;
  tags: string | null;
  description: string | null;
  access_level: string;
  file_url: string;
  original_filenames?: string | null;
  created_at: string;
  edited_at?: string | null;
};

type DetailState = {
  title: string;
  owner: string;
  displayDate: string;
  editedDisplay: string | null;
  department: string;
  category: string;
  tags: string;
  description: string;
  allFileUrls: string[];
  originalNames: string[];
};

export default function DocumentDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);

  const idParam = searchParams.get("id");

  // โหลดข้อมูลจาก DB ตาม id เมื่อไม่มีข้อมูลครบจาก query
  useEffect(() => {
    if (!idParam) return;

    // ถ้ามี title และ fileUrls ใน query อยู่แล้ว ให้ใช้ต่อไป ไม่ต้องยิง DB
    const hasQueryData =
      !!searchParams.get("title") &&
      (!!searchParams.get("fileUrls") || !!searchParams.get("fileUrl"));
    if (hasQueryData) {
      return;
    }

    const numericId = Number(idParam);
    if (!Number.isFinite(numericId)) return;

    const fetchFromDb = async () => {
      try {
        const res = await fetch("/api/documents");
        if (!res.ok) return;
        const data = await res.json();
        const docs = (data.documents || []) as DbDocument[];
        const dbDoc = docs.find((d) => d.id === numericId);
        if (!dbDoc) return;

        const allFileUrls: string[] = (() => {
          try {
            const parsed = JSON.parse(dbDoc.file_url);
            if (Array.isArray(parsed)) {
              return parsed.filter((u) => typeof u === "string" && u.length > 0);
            }
          } catch {}
          return dbDoc.file_url ? [dbDoc.file_url] : [];
        })();

        const originalNames: string[] = (() => {
          if (!dbDoc.original_filenames) return [];
          try {
            const parsed = JSON.parse(dbDoc.original_filenames);
            if (Array.isArray(parsed)) {
              return parsed.filter((n) => typeof n === "string" && n.length > 0);
            }
          } catch {}
          return [];
        })();

        function formatThaiDateTime(createdAt: string | null): string {
          if (!createdAt) return "ไม่พบวันที่บันทึกเอกสาร";
          try {
            const match = createdAt.match(
              /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/
            );
            let d: Date;
            if (match) {
              const [, y, m, day, hh, mm, ss] = match;
              const year = Number(y);
              const monthIndex = Number(m) - 1;
              const dateNum = Number(day);
              const hour = Number(hh);
              const minute = Number(mm);
              const second = Number(ss);
              const utcMs = Date.UTC(
                year,
                monthIndex,
                dateNum,
                hour,
                minute,
                second
              );
              d = new Date(utcMs + 7 * 60 * 60 * 1000);
            } else {
              d = new Date(createdAt);
            }
            if (Number.isNaN(d.getTime())) return "ไม่พบวันที่บันทึกเอกสาร";

            const monthsTh = [
              "ม.ค.",
              "ก.พ.",
              "มี.ค.",
              "เม.ย.",
              "พ.ค.",
              "มิ.ย.",
              "ก.ค.",
              "ส.ค.",
              "ก.ย.",
              "ต.ค.",
              "พ.ย.",
              "ธ.ค.",
            ];
            const yyyy = d.getFullYear();
            const mmIndex = d.getMonth();
            const ddNum = d.getDate();
            const hh2 = String(d.getHours()).padStart(2, "0");
            const min2 = String(d.getMinutes()).padStart(2, "0");
            const beYear = yyyy + 543;
            const monthName = monthsTh[mmIndex] ?? "";
            return `${ddNum} ${monthName} ${beYear} ${hh2}:${min2} น.`;
          } catch {
            return "ไม่พบวันที่บันทึกเอกสาร";
          }
        }

        function formatThaiEdited(editedAt: string | null | undefined): string | null {
          if (!editedAt) return null;
          const s = formatThaiDateTime(editedAt);
          return s === "ไม่พบวันที่บันทึกเอกสาร" ? null : s;
        }

        setDetail({
          title: dbDoc.title || "ไม่พบชื่อเอกสาร",
          owner: "ไม่ระบุผู้บันทึก",
          displayDate: formatThaiDateTime(dbDoc.created_at || null),
          editedDisplay: formatThaiEdited(dbDoc.edited_at ?? null),
          department: dbDoc.department || "ไม่ระบุหน่วยงาน/สถาบัน",
          category: dbDoc.tags || "ไม่ระบุหมวดหมู่เอกสาร",
          tags: dbDoc.tags || "ไม่ระบุคำสำคัญ",
          description:
            dbDoc.description ||
            "คำอธิบายเอกสารจะแสดงในส่วนนี้เมื่อเชื่อมต่อกับข้อมูลจริงแล้ว",
          allFileUrls,
          originalNames,
        });
      } catch (error) {}
    };

    fetchFromDb();
  }, [idParam, searchParams]);

  // ค่าจาก query (fallback กรณีเปิดมาจากหน้า Search ตามเดิม)
  let title = searchParams.get("title") ?? "ไม่พบชื่อเอกสาร";
  let owner = searchParams.get("owner") ?? "ไม่ระบุผู้บันทึก";
  let displayDate =
    searchParams.get("created") ?? "ไม่พบวันที่บันทึกเอกสาร";
  let editedDisplay = searchParams.get("edited") ?? null;
  let department = searchParams.get("department") ?? "ไม่ระบุหน่วยงาน/สถาบัน";
  let category = searchParams.get("category") ?? "ไม่ระบุหมวดหมู่เอกสาร";
  let tags = searchParams.get("tags") ?? "ไม่ระบุคำสำคัญ";
  let description =
    searchParams.get("description") ??
    "คำอธิบายเอกสารจะแสดงในส่วนนี้เมื่อเชื่อมต่อกับข้อมูลจริงแล้ว";

  // รองรับไฟล์แนบหลายไฟล์: fileUrls (JSON array) หรือ fileUrl เดี่ยว
  const fileUrlsParam = searchParams.get("fileUrls");
  const singleFileUrl = searchParams.get("fileUrl") ?? undefined;
  const originalNamesParam = searchParams.get("originalNames");
  let allFileUrls: string[] = [];
  let originalNames: string[] = [];
  if (fileUrlsParam) {
    try {
      const parsed = JSON.parse(fileUrlsParam);
      if (Array.isArray(parsed)) {
        allFileUrls = parsed.filter((u) => typeof u === "string" && u.length > 0);
      }
    } catch {
      // ถ้า parse ไม่ได้ ให้ข้ามไปใช้ singleFileUrl แทน
    }
  }
  if (allFileUrls.length === 0 && singleFileUrl) {
    allFileUrls = [singleFileUrl];
  }

  if (originalNamesParam) {
    try {
      const parsed = JSON.parse(originalNamesParam);
      if (Array.isArray(parsed)) {
        originalNames = parsed.filter(
          (n) => typeof n === "string" && n.length > 0
        );
      }
    } catch {
      // ignore parse error and keep originalNames as empty
    }
  }

  // ถ้ามี detail ที่โหลดจากฐานข้อมูลแล้ว ให้ใช้ค่าจาก DB แทนค่าจาก query
  if (detail) {
    title = detail.title;
    owner = detail.owner;
    displayDate = detail.displayDate;
    editedDisplay = detail.editedDisplay;
    department = detail.department;
    category = detail.category;
    tags = detail.tags;
    description = detail.description;
    allFileUrls = detail.allFileUrls;
    originalNames = detail.originalNames;
  }

  function handleDownload() {
    if (allFileUrls.length === 1) {
      // กรณีมีไฟล์เดียว ดาวน์โหลดไฟล์เดียวตรง ๆ ไม่ต้องเป็น ZIP
      const singleUrl = allFileUrls[0];
      const baseName = originalNames[0] || title || "document";
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
        singleUrl
      )}&filename=${encodeURIComponent(baseName)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (allFileUrls.length > 1) {
      // กรณีมีหลายไฟล์ ให้ดาวน์โหลดเป็น ZIP เดียว
      const fileUrlsParam = encodeURIComponent(JSON.stringify(allFileUrls));
      const titleParam = encodeURIComponent(title || "document");
      const originalNamesParam = encodeURIComponent(
        JSON.stringify(originalNames)
      );

      const downloadUrl = `/api/download-zip?fileUrls=${fileUrlsParam}&title=${titleParam}&originalNames=${originalNamesParam}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
    setDownloadMessage(`ดาวน์โหลดเอกสาร "${title}" สำเร็จแล้ว`);
    setTimeout(() => setDownloadMessage(null), 2500);
  }

  function handleDeleteClick() {
    setShowConfirmDelete(true);
  }

  function handleCancelDelete() {
    setShowConfirmDelete(false);
  }

  function handleConfirmDelete() {
    setShowConfirmDelete(false);

    if (!idParam) {
      setDeleteMessage("ไม่พบรหัสเอกสารสำหรับลบ");
      setTimeout(() => setDeleteMessage(null), 2500);
      return;
    }

    const deleteDocument = async () => {
      try {
        const res = await fetch(`/api/documents?id=${encodeURIComponent(idParam)}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Delete failed");
        }

        setDeleteMessage(`ดำเนินการลบเอกสาร "${title}" สำเร็จแล้ว`);
        setTimeout(() => {
          setDeleteMessage(null);
          router.push("/search");
        }, 1500);
      } catch (error) {
        console.error("Delete error", error);
        setDeleteMessage("ไม่สามารถลบเอกสารได้ กรุณาลองใหม่อีกครั้ง");
        setTimeout(() => setDeleteMessage(null), 2500);
      }
    };

    deleteDocument();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      {/* Header */}
    <header className="bg-indigo-800 text-white shadow">
      <div className="flex h-14 w-full items-stretch">
        <div className="flex items-stretch">
          <div className="flex items-center bg-white px-6">
            <Link href="/" className="flex items-center gap-2 text-indigo-800">
              <img src="/fti-logo.png" alt="EDMS" className="h-8 w-auto" />
              <span className="text-lg font-semibold tracking-wide">EDMS</span>
            </Link>
          </div>
          <div className="header-logo-notch h-full w-16 bg-white" />
        </div>

        <nav className="ml-auto flex items-center gap-2 px-8 text-xs font-medium">
          <Link
            href="/"
            className="rounded-full border border-white/60 bg-white/10 px-4 py-1.5 text-white transition hover:bg-white hover:text-indigo-800"
          >
            Home
          </Link>
          <Link
            href="/document"
            className="rounded-full border border-white/60 bg-white/10 px-4 py-1.5 text-white transition hover:bg-white hover:text-indigo-800"
          >
            Document
          </Link>
          <Link
            href="/search"
            className="rounded-full bg-white px-4 py-1.5 text-indigo-800 shadow-sm"
          >
            Search
          </Link>
        </nav>
      </div>
    </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        <section className="rounded-2xl border border-indigo-100 bg-white px-8 py-6 text-xs shadow-sm md:px-10 md:py-8">
          {/* Title row */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-rose-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-500 text-lg text-white shadow-sm">
                📄
              </span>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-2 rounded-full bg-indigo-700 px-4 py-2 text-[11px] font-medium text-white shadow hover:bg-indigo-800"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                📥
              </span>
              <span>ดาวน์โหลดเอกสาร</span>
            </button>
          </div>

          {/* Meta info */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-[11px] text-slate-800 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-[13px]">📚</span>
              <span>ข้อมูลสรุปของเอกสาร</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[13px]">📅</span>
                  <span>วันที่บันทึกเอกสาร</span>
                </div>
                <p className="text-slate-700">{displayDate}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[13px]">✏️</span>
                  <span>แก้ไขล่าสุด</span>
                </div>
                <p className="text-slate-700">
                  {editedDisplay || "ขณะนี้ยังไม่มีข้อมูลการแก้ไข"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[13px]">👤</span>
                  <span>ผู้บันทึกเอกสาร</span>
                </div>
                <p className="text-slate-700">{owner}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[13px]">💡</span>
                  <span>หมวดหมู่ / ประเภทเอกสาร</span>
                </div>
                <p className="text-slate-700">{category}</p>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[13px]">🏢</span>
                  <span>หน่วยงาน / สถาบัน</span>
                </div>
                <p className="text-slate-700">{department}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-[13px]">#</span>
                  <span>คำสำคัญ (Tags)</span>
                </div>
                <p className="text-slate-700">{tags}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-[11px] text-slate-800 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-[13px]">📝</span>
              <span>รายละเอียดเอกสาร</span>
            </h2>
            <p className="text-slate-700">{description}</p>
          </div>

          {/* Attachments list only */}
          <div className="mb-6 space-y-3 text-[11px] text-slate-800">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-[13px]">👁️</span>
              <span>ไฟล์แนบเอกสาร</span>
            </h2>

            {allFileUrls.length > 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-700 shadow-sm">
                <div className="mb-2 font-semibold text-slate-900">ไฟล์แนบทั้งหมด ({allFileUrls.length} ไฟล์)</div>
                <ul className="space-y-2">
                  {[...allFileUrls].slice().reverse().map((url, index) => {
                    const reversedIndex = allFileUrls.length - 1 - index;
                    const defaultName = `${title || "document"}-ไฟล์ที่-${reversedIndex + 1}`;
                    const originalNameRaw = originalNames[reversedIndex] ?? "";
                    const originalName = originalNameRaw.trim();
                    const nameForType = (originalName || url).toLowerCase();

                    const isPdf = nameForType.endsWith(".pdf");
                    const isDoc =
                      nameForType.endsWith(".doc") || nameForType.endsWith(".docx");
                    const displayName = originalName || `ไฟล์ที่ ${index + 1}`;

                    const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
                      url
                    )}&filename=${encodeURIComponent(originalName || defaultName)}`;

                    const previewUrl = isPdf
                      ? `/api/preview?fileUrl=${encodeURIComponent(url)}`
                      : url;

                    return (
                      <li
                        key={index}
                        className="space-y-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px]">
                              📄
                            </span>
                            <span className="truncate text-slate-700">{displayName}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {!isDoc && (
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-full bg-slate-700 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-slate-800"
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                                  🔍
                                </span>
                                <span>เปิดดูไฟล์</span>
                              </a>
                            )}
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-indigo-700 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-indigo-800"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[10px]">
                                📥
                              </span>
                              <span>ดาวน์โหลดเอกสาร</span>
                            </a>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-500 shadow-sm">
                ยังไม่มีไฟล์แนบสำหรับเอกสารรายการนี้
              </div>
            )}
          </div>

          {/* Danger zone */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex items-center gap-2 rounded-full bg-rose-600 px-8 py-2 text-[11px] font-medium text-white shadow hover:bg-rose-700"
            >
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                🗑️
              </span>
              <span>ลบเอกสาร</span>
            </button>
          </div>
        </section>
      </main>

      {/* Confirm delete modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-xs text-slate-800 shadow-lg">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700">
              <span>⚠️</span>
              <span>ยืนยันการลบเอกสาร</span>
            </h2>
            <p className="mb-4 text-[11px] text-slate-600">
              คุณต้องการลบเอกสาร "{title}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="rounded-full bg-slate-200 px-4 py-1.5 text-slate-700 hover:bg-slate-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 px-4 py-1.5 text-white shadow hover:bg-rose-700"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download success popup */}
      {downloadMessage && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs text-white shadow-lg">
            <span>✅</span>
            <span>{downloadMessage}</span>
          </div>
        </div>
      )}

      {/* Delete success popup */}
      {deleteMessage && (
        <div className="fixed left-1/2 top-16 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-rose-600 px-4 py-2 text-xs text-white shadow-lg">
            <span>🗑️</span>
            <span>{deleteMessage}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto bg-indigo-800 py-4 text-[11px] text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4">
          <div className="flex items-center">
            <img
              src="/fti-logo.png"
              alt="FTI"
              className="h-8 w-auto"
            />
          </div>
          <div className="mx-auto flex flex-col items-center text-center text-[11px] leading-snug text-slate-100">
            <span>© 2025 จัดทำโดย ฝ่ายดิจิทัลและเทคโนโลยีสารสนเทศ สภาอุตสาหกรรมแห่งประเทศไทย</span>
            <span>จัดทำโดย นางสาวกัลยรักษ์ โรจนเลิศประเสริฐ</span>
            <span>นิสิตฝึกงาน มหาวิทยาลัยพะเยา</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
