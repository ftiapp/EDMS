"use client";

import Link from "next/link";
import UserNavbar from "../components/UserNavbar";
import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams, useRouter } from "next/navigation";

type DbDocument = {
  id: number;
  title: string;
  department: string;
  owner_email: string | null;
  tags: string | null;
  description: string | null;
  access_level: string;
  file_url: string;
  original_filenames?: string | null;
  created_at: string;
  edited_at?: string | null;
};

function formatThaiDateTime(raw: string | null | undefined): string {
  if (!raw) return "ไม่พบวันที่บันทึกเอกสาร";
  try {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    let d: Date;
    if (match) {
      const [, y, m, day, hh, mm, ss] = match;
      const year = Number(y);
      const monthIndex = Number(m) - 1;
      const dateNum = Number(day);
      const hour = Number(hh);
      const minute = Number(mm);
      const second = Number(ss);
      const utcMs = Date.UTC(year, monthIndex, dateNum, hour, minute, second);
      d = new Date(utcMs + 7 * 60 * 60 * 1000);
    } else {
      d = new Date(raw);
    }
    if (Number.isNaN(d.getTime())) return raw;

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
    return raw ?? "";
  }
}

// ใช้สำหรับแปลง created_at เป็นวันที่แบบ yyyy-mm-dd เพื่อกรองช่วงวันที่
function toLocalDateString(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/);
    let d: Date;
    if (match) {
      const [, y, m, day, hh, mm, ss] = match;
      const year = Number(y);
      const monthIndex = Number(m) - 1;
      const dateNum = Number(day);
      const hour = Number(hh);
      const minute = Number(mm);
      const second = Number(ss);
      const utcMs = Date.UTC(year, monthIndex, dateNum, hour, minute, second);
      d = new Date(utcMs + 7 * 60 * 60 * 1000);
    } else {
      d = new Date(raw);
    }

    if (Number.isNaN(d.getTime())) return null;

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  } catch {
    return null;
  }
}

export default function MyDocumentsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const email = (searchParams.get("email") ?? "").trim();
  const department = (searchParams.get("department") ?? "").trim();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DbDocument | null>(
    null
  );
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);

  // ฟิลเตอร์ค้นหาและช่วงวันที่
  const [qInput, setQInput] = useState("");
  const [startInput, setStartInput] = useState("");
  const [endInput, setEndInput] = useState("");

  // กรองเอกสารตามคำค้นและช่วงวันที่
  const q = qInput.trim().toLowerCase();

  const filteredDocs = docs.filter((doc) => {
    if (q) {
      const haystack = [
        doc.title,
        doc.department,
        doc.owner_email ?? "",
        doc.tags ?? "",
        doc.description ?? "",
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    const localDate = toLocalDateString(doc.created_at);
    const startDate = startInput;
    const endDate = endInput;

    if (startDate && localDate && localDate < startDate) return false;
    if (endDate && localDate && localDate > endDate) return false;

    return true;
  });

  // Pagination: แสดงเอกสารของฉันทีละ 9 รายการจากผลที่กรองแล้ว
  const pageSize = 9;
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedDocs = filteredDocs.slice(startIndex, endIndex);

  // สร้างรายการเลขหน้าพร้อมจุดไข่ปลา ถ้าหน้าเยอะ (โครงแบบเดียวกับหน้า search)
  const maxPageButtons = 5;
  const pageItems: (number | string)[] = [];

  if (totalPages <= maxPageButtons) {
    for (let i = 1; i <= totalPages; i++) pageItems.push(i);
  } else {
    const windowSize = 3;
    const windowHalf = Math.floor(windowSize / 2);

    let windowStart = safeCurrentPage - windowHalf;
    let windowEnd = safeCurrentPage + windowHalf;

    if (windowStart < 2) {
      windowStart = 2;
      windowEnd = windowStart + windowSize - 1;
    }
    if (windowEnd > totalPages - 1) {
      windowEnd = totalPages - 1;
      windowStart = windowEnd - windowSize + 1;
      if (windowStart < 2) windowStart = 2;
    }

    pageItems.push(1);
    if (windowStart > 2) pageItems.push("...");
    for (let i = windowStart; i <= windowEnd; i++) {
      pageItems.push(i);
    }
    if (windowEnd < totalPages - 1) pageItems.push("...");
    pageItems.push(totalPages);
  }

  function handleQuickDownload(
    title: string,
    allFileUrls: string[],
    originalNames: string[]
  ) {
    if (!allFileUrls || allFileUrls.length === 0) return;

    if (allFileUrls.length === 1) {
      const singleUrl = allFileUrls[0];
      const baseName = (originalNames[0] || title || "document").trim();
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
        singleUrl
      )}&filename=${encodeURIComponent(baseName)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return;
    }

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

  useEffect(() => {
    if (!email) {
      setDocs([]);
      setError("ไม่พบอีเมลผู้ใช้ กรุณาเข้าผ่านลิงก์จากหน้าแรกของระบบ");
      return;
    }

    const controller = new AbortController();
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("email", email);
        if (department) params.set("department", department);
        const res = await fetch(`/api/documents?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error("failed");
        }
        const data = await res.json();
        const all = (data.documents || []) as DbDocument[];
        // เอกสารของฉัน = owner_email ตรงกับ email ปัจจุบัน
        const mine = all.filter(
          (d) => (d.owner_email || "").trim().toLowerCase() === email.toLowerCase()
        );
        setDocs(mine);
      } catch (err) {
        if ((err as any).name === "AbortError") return;
        console.error("My documents load error", err);
        setError("ไม่สามารถดึงรายการเอกสารของคุณได้");
      } finally {
        setLoading(false);
      }
    };

    load();
    return () => controller.abort();
  }, [email, department]);

  function handleRequestDelete(doc: DbDocument) {
    if (!email) return;
    setConfirmDeleteDoc(doc);
  }

  async function handleConfirmDelete() {
    if (!email || !confirmDeleteDoc) return;

    const { id } = confirmDeleteDoc;
    setDeletingId(id);

    try {
      const params = new URLSearchParams();
      params.set("id", String(id));
      params.set("email", email);
      const res = await fetch(`/api/documents?${params.toString()}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Delete failed");
      }

      setDocs((prev) => prev.filter((d) => d.id !== id));
      setConfirmDeleteDoc(null);
    } catch (err) {
      console.error("Delete error", err);
      window.alert("ไม่สามารถลบเอกสารได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);
  }

  function handleReset() {
    setQInput("");
    setStartInput("");
    setEndInput("");
    setCurrentPage(1);
  }

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      <UserNavbar />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        <section className="rounded-2xl border border-slate-100 bg-white px-6 py-5 text-xs shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="space-y-1">
              <h1 className="flex items-center gap-2 text-lg font-semibold text-rose-700">
                <span className="inline-flex h-4 w-4 items-center justify-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                  </svg>
                </span>
                <span>แก้ไขเอกสารของฉัน</span>
              </h1>
              <p className="text-[11px] text-slate-600">
                แสดงเฉพาะเอกสารที่คุณเป็นผู้บันทึก และสามารถเข้าไปแก้ไขได้
              </p>
            </div>
          </div>

          {/* แถบค้นหาและช่วงวันที่ */}
          <form
            className="mb-3 flex flex-wrap items-end gap-3"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-50 text-slate-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
              </span>
              <input
                type="text"
                name="q"
                value={qInput}
                onChange={(e) => setQInput(e.target.value)}
                placeholder="ค้นหาจากชื่อเอกสาร , หน่วยงาน , เจ้าของ , คำอธิบาย"
                className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
              />
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-slate-700">
              <span>วันที่เริ่มต้น</span>
              <input
                type="date"
                name="startDate"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="min-w-[160px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm text-slate-700 font-sans"
              />
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-slate-700">
              <span>วันที่สิ้นสุด</span>
              <input
                type="date"
                name="endDate"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="min-w-[160px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm text-slate-700 font-sans"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 rounded-full bg-slate-900 px-4 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-black"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-3 w-3 text-slate-900"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 12a9 9 0 1 1 9 9" />
                    <path d="M3 4v8h8" />
                  </svg>
                </span>
                <span>รีเซ็ต</span>
              </button>
            </div>
          </form>

          {/* จำนวนเอกสารที่พบ */}
          <div className="mb-3 flex items-baseline justify-between text-xs">
            <span className="font-semibold text-slate-800">
              เอกสารทั้งหมด ({filteredDocs.length} รายการ)
            </span>
          </div>

          {loading && (
            <div className="rounded-xl bg-slate-50 px-4 py-3 text-[11px] text-slate-700">
              กำลังโหลดรายการเอกสารของคุณ...
            </div>
          )}

          {!loading && error && (
            <div className="rounded-xl bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
              {error}
            </div>
          )}

          {!loading && !error && docs.length === 0 && (
            <div className="rounded-xl bg-slate-50 px-4 py-6 text-center text-[11px] text-slate-500">
              ขณะนี้ยังไม่พบเอกสารที่คุณเป็นผู้บันทึก
            </div>
          )}

          {!loading && !error && filteredDocs.length > 0 && (
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {pagedDocs.map((doc) => {
                const createdDisplay = formatThaiDateTime(doc.created_at);
                const editedDisplay = doc.edited_at ? formatThaiDateTime(doc.edited_at) : null;

                // แปลง file_url และ original_filenames ให้เป็น array สำหรับส่งไปหน้า detail
                let allFileUrls: string[] = [];
                try {
                  const parsed = JSON.parse(doc.file_url);
                  if (Array.isArray(parsed)) {
                    allFileUrls = parsed.filter((u) => typeof u === "string" && u.length > 0);
                  }
                } catch {
                  if (doc.file_url) allFileUrls = [doc.file_url];
                }

                let originalNames: string[] = [];
                if (doc.original_filenames) {
                  try {
                    const parsedNames = JSON.parse(doc.original_filenames);
                    if (Array.isArray(parsedNames)) {
                      originalNames = parsedNames.filter(
                        (n) => typeof n === "string" && n.length > 0
                      );
                    }
                  } catch {
                    // ignore
                  }
                }

                return (
                  <div
                    key={doc.id}
                    className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-[11px] text-slate-800 shadow-sm transition-transform duration-150 hover:-translate-y-1 hover:shadow-lg"
                  >
                    <div className="mb-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose-600 text-[11px] font-semibold text-white shadow-sm">
                          {doc.title.charAt(0) || "เ"}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12px] font-semibold text-slate-900">
                            {doc.title}
                          </div>
                          <div className="flex flex-wrap gap-1 text-[10px] text-slate-600">
                            <span className="rounded-full bg-indigo-50 px-2 py-[2px] text-indigo-700">
                              {doc.department || "ไม่ระบุหน่วยงาน"}
                            </span>
                            <span className="rounded-full bg-rose-50 px-2 py-[2px] text-rose-700">
                              {doc.tags || "ไม่ระบุหมวดหมู่"}
                            </span>
                          </div>
                        </div>
                        <div className="ml-2 flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleQuickDownload(doc.title, allFileUrls, originalNames)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700 shadow-sm hover:bg-emerald-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M12 3v12" />
                              <path d="M8 11l4 4 4-4" />
                              <rect x="4" y="17" width="16" height="3" rx="1" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRequestDelete(doc)}
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-sm hover:bg-rose-100"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3.5 w-3.5"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M3 6h18" />
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                              <path d="M6 6v14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V6" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-slate-600">
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-[2px]">
                          <span className="text-slate-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                              <line x1="3" y1="10" x2="21" y2="10" />
                            </svg>
                          </span>
                          <span>บันทึกเมื่อ: {createdDisplay}</span>
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-2 py-[2px]">
                          <span className="text-slate-500">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              className="h-3 w-3"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              <path d="M4 20h4l10-10-4-4L4 16v4z" />
                              <path d="M14 6l4 4" />
                            </svg>
                          </span>
                          <span>
                            แก้ไขล่าสุด: {editedDisplay || "ขณะนี้ยังไม่มีข้อมูลการแก้ไข"}
                          </span>
                        </span>
                      </div>
                    </div>
                    <div className="mt-auto flex flex-row items-center justify-center gap-3 pt-3 text-[11px] font-medium">
                      <Link
                        href={{
                          pathname: "/detail",
                          query: {
                            id: String(doc.id),
                            title: doc.title,
                            owner: doc.owner_email ?? "",
                            created: createdDisplay,
                            edited: editedDisplay ?? "",
                            department: doc.department,
                            category: doc.tags ?? "",
                            tags: `${doc.tags ?? ""} ${doc.department ?? ""}`,
                            description: doc.description ?? "",
                            email,
                            fileUrl: allFileUrls[0] ?? "",
                            fileUrls: JSON.stringify(allFileUrls),
                            originalNames: JSON.stringify(originalNames),
                          },
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-6 py-2 text-white shadow hover:bg-emerald-700"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-emerald-700">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                        <span className="whitespace-nowrap">รายละเอียด</span>
                      </Link>
                      <Link
                        href={{
                          pathname: "/edit",
                          query: {
                            id: String(doc.id),
                            title: doc.title,
                            department: doc.department,
                            tags: doc.tags ?? "",
                            description: doc.description ?? "",
                            email,
                          },
                        }}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-900 px-6 py-2 text-white shadow hover:bg-black"
                      >
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-slate-800">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-3 w-3"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </span>
                        <span className="whitespace-nowrap">แก้ไขเอกสารนี้</span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={safeCurrentPage === 1}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ก่อนหน้า
            </button>
            {pageItems.map((item, index) =>
              typeof item === "number" ? (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCurrentPage(item)}
                  className={
                    "min-w-[32px] rounded-full border px-2 py-1 text-center " +
                    (item === safeCurrentPage
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50")
                  }
                >
                  {item}
                </button>
              ) : (
                <span
                  key={`ellipsis-${index}`}
                  className="px-1 text-slate-400 select-none"
                >
                  ...
                </span>
              )
            )}
            <button
              type="button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={safeCurrentPage === totalPages}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50"
            >
              ถัดไป
            </button>
          </div>
        )}
      </main>

      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white px-8 py-6 text-sm text-slate-800 shadow-2xl">
            <h2 className="mb-3 text-base font-semibold text-rose-700">
              ยืนยันการลบเอกสาร
            </h2>
            <p className="mb-6 text-[13px] text-slate-700">
              คุณต้องการลบเอกสาร "{confirmDeleteDoc.title}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3 text-[13px]">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="rounded-full border border-slate-300 bg-white px-5 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                disabled={deletingId === confirmDeleteDoc.id}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="rounded-full bg-rose-600 px-6 py-2 font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                disabled={deletingId === confirmDeleteDoc.id}
              >
                {deletingId === confirmDeleteDoc.id ? "กำลังลบ..." : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
