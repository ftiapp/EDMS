"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export default function DocumentDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);

  function getTodayDisplayDate(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${dd}/${mm}/${yyyy}`;
  }

  const title = searchParams.get("title") ?? "ไม่พบชื่อเอกสาร";
  const owner = searchParams.get("owner") ?? "ไม่ระบุผู้บันทึก";
  const idParam = searchParams.get("id");
  const displayDate = getTodayDisplayDate();
  const department = searchParams.get("department") ?? "ไม่ระบุหน่วยงาน/สถาบัน";
  const category = searchParams.get("category") ?? "ไม่ระบุหมวดหมู่เอกสาร";
  const tags = searchParams.get("tags") ?? "ไม่ระบุคำสำคัญ";
  const description =
    searchParams.get("description") ??
    "คำอธิบายเอกสารจะแสดงในส่วนนี้เมื่อเชื่อมต่อกับข้อมูลจริงแล้ว";

  // รองรับไฟล์แนบหลายไฟล์: fileUrls (JSON array) หรือ fileUrl เดี่ยว
  const fileUrlsParam = searchParams.get("fileUrls");
  const singleFileUrl = searchParams.get("fileUrl") ?? undefined;
  let allFileUrls: string[] = [];
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

  function handleDownload() {
    if (allFileUrls.length === 1) {
      // กรณีมีไฟล์เดียว ดาวน์โหลดไฟล์เดียวตรง ๆ ไม่ต้องเป็น ZIP
      const singleUrl = allFileUrls[0];
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
        singleUrl
      )}&filename=${encodeURIComponent(title || "document")}`;

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

      const downloadUrl = `/api/download-zip?fileUrls=${fileUrlsParam}&title=${titleParam}`;

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
      <header className="flex items-center justify-between bg-indigo-800 px-8 py-3 text-white shadow">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl leading-none">📄</span>
          <span className="text-lg font-semibold tracking-wide">EDMS</span>
        </Link>

        <nav className="flex items-center gap-2 text-xs font-medium">
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
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        <section className="rounded-2xl border border-rose-100 bg-rose-50 px-8 py-6 text-xs shadow-sm md:px-10 md:py-8">
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
          <div className="mb-6 rounded-xl bg-white/70 px-4 py-4 text-[11px] text-slate-800 shadow-sm">
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
          <div className="mb-4 space-y-2 rounded-xl bg-white/70 px-4 py-4 text-[11px] text-slate-800 shadow-sm">
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
              <div className="rounded-xl bg-white/60 px-4 py-3 text-[11px] text-slate-700">
                <div className="mb-2 font-semibold text-slate-900">ไฟล์แนบทั้งหมด ({allFileUrls.length} ไฟล์)</div>
                <ul className="space-y-2">
                  {[...allFileUrls].slice().reverse().map((url, index) => {
                    const lower = url.toLowerCase();
                    const isImage =
                      lower.endsWith(".jpg") ||
                      lower.endsWith(".jpeg") ||
                      lower.endsWith(".png") ||
                      lower.endsWith(".gif") ||
                      lower.endsWith(".webp");
                    const isPdf = lower.endsWith(".pdf");

                    const reversedIndex = allFileUrls.length - 1 - index;
                    const defaultName = `${title || "document"}-ไฟล์ที่-${reversedIndex + 1}`;

                    const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
                      url
                    )}&filename=${encodeURIComponent(defaultName)}`;

                    const previewUrl = isPdf
                      ? `/api/preview?fileUrl=${encodeURIComponent(url)}`
                      : url;

                    return (
                      <li
                        key={index}
                        className="space-y-2 rounded-lg border border-slate-200 bg-white/80 px-3 py-2 shadow-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px]">
                              📄
                            </span>
                            <span className="truncate text-slate-700">ไฟล์ที่ {index + 1}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
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
                        {isImage && (
                          <div className="flex justify-center">
                            <img
                              src={url}
                              alt={`ไฟล์ที่ ${index + 1}`}
                              className="max-h-[260px] max-w-full rounded-md object-contain"
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl bg-white/60 px-4 py-3 text-[11px] text-slate-500">
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
      <footer className="mt-auto bg-indigo-800 py-3 text-center text-[11px] text-white">
        © 2025 Created by Kanyarak Rojanalertprasert
      </footer>
    </div>
  );
}
