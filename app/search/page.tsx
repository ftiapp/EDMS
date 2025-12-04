"use client";

import Link from "next/link";
import UserNavbar from "../components/UserNavbar";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type DbDocument = {
  id: number;
  title: string;
  department: string;
  owner_email: string | null;
  tags: string | null;
  description: string | null;
  access_level: "private" | "team" | "public";
  file_url: string;
  created_at: string;
  edited_at?: string | null;
  original_filenames?: string | null;
};

type UiDocument = {
  id: number;
  title: string;
  deptTag: string;
  category: string;
  date: string;
  rawDate: string;
  owner: string;
  description: string;
  color: string;
  access: "private" | "team" | "public";
  fileUrl: string;
  allFileUrls: string[];
  originalNames: string[];
  editedDisplay?: string;
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQ = searchParams.get("q") ?? "";
  const initialStart = searchParams.get("startDate") ?? "";
  const initialEnd = searchParams.get("endDate") ?? "";
  const initialAccess = searchParams.get("access") ?? "";
  const email = searchParams.get("email") ?? "";
  const department = searchParams.get("department") ?? "";

  const [qInput, setQInput] = useState(initialQ);
  const [startInput, setStartInput] = useState(initialStart);
  const [endInput, setEndInput] = useState(initialEnd);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UiDocument[]>([]);
  const [accessFilter, setAccessFilter] = useState(initialAccess);
  const [currentPage, setCurrentPage] = useState(1);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<UiDocument | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const q = qInput.toLowerCase();

  function formatThaiDateTime(raw: string | null | undefined): string {
    if (!raw) return "ไม่พบวันที่บันทึกเอกสาร";
    try {
      const match = raw.match(
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
      return raw;
    }
  }

  // แปลงวันที่/เวลาจากฐานข้อมูลให้เป็นวันที่แบบท้องถิ่น (รูปแบบ yyyy-mm-dd)
  // เพื่อใช้ในการกรองช่วงวันที่ให้ตรงกับค่าที่ผู้ใช้เลือกจาก input type="date"
  function toLocalDateString(raw: string | null | undefined): string | null {
    if (!raw) return null;
    try {
      const match = raw.match(
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
        // ชดเชยเวลาให้เป็นเวลาไทย (UTC+7) แล้วจึงดึงเฉพาะส่วนวันที่
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

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const params = new URLSearchParams();
        if (email) params.set("email", email);
        if (department) params.set("department", department);
        const query = params.toString();
        const url = query ? `/api/documents?${query}` : "/api/documents";
        const res = await fetch(url);

        if (!res.ok) return;
        const data = await res.json();
        const dbDocs = (data.documents || []) as DbDocument[];

        const uiDocs: UiDocument[] = dbDocs.map((doc, index) => {
          const colors = [
            "border-emerald-600",
            "border-sky-600",
            "border-rose-600",
            "border-lime-600",
            "border-indigo-600",
            "border-amber-600",
          ];

          // ใช้วันที่/เวลา created_at จากฐานข้อมูลเป็นแหล่งเดียวสำหรับวันที่สร้าง
          const rawDate = doc.created_at;
          const displayDate = formatThaiDateTime(rawDate);

          // แปลง edited_at เป็นข้อความภาษาไทย
          const editedDisplay = doc.edited_at
            ? formatThaiDateTime(doc.edited_at)
            : undefined;

          let primaryFileUrl = doc.file_url;
          let allFileUrls: string[] = [];
          let originalNames: string[] = [];

          try {
            const parsed = JSON.parse(doc.file_url);
            if (Array.isArray(parsed) && parsed.length > 0) {
              primaryFileUrl = parsed[0];
              allFileUrls = parsed;
            }
          } catch {
            if (typeof doc.file_url === "string" && doc.file_url) {
              allFileUrls = [doc.file_url];
            }
          }

          // แปลง original_filenames (JSON string) ให้เป็น array ของชื่อไฟล์
          if (doc.original_filenames) {
            try {
              const parsedNames = JSON.parse(doc.original_filenames);
              if (Array.isArray(parsedNames)) {
                originalNames = parsedNames.filter(
                  (n) => typeof n === "string" && n.length > 0
                );
              }
            } catch {
              // ถ้า parse ไม่ได้ ให้ปล่อย originalNames เป็น array ว่าง
            }
          }

          // normalize access level - รองรับทั้งภาษาไทยและอังกฤษ
          const rawAccess = (doc.access_level || "").toString().toLowerCase().trim();
          let normalizedAccess: "private" | "team" | "public" = "private";

          if (rawAccess.includes("team") || rawAccess.includes("ทีม")) {
            normalizedAccess = "team";
          } else if (rawAccess.includes("public") || rawAccess.includes("สาธารณะ")) {
            normalizedAccess = "public";
          } else {
            console.log(`DOC ${doc.title}: Raw="${doc.access_level}" → Normalized="${normalizedAccess}"`);
          }

          return {
            id: doc.id,
            title: doc.title,
            deptTag: doc.department,
            category: doc.tags || "",
            date: displayDate,
            rawDate,

            owner: doc.owner_email || "",
            description: doc.description || "",
            color: colors[index % colors.length],
            access: normalizedAccess,
            fileUrl: primaryFileUrl,
            allFileUrls,
            originalNames,
            editedDisplay,
          };
        });

        setDocuments(uiDocs);
      } catch (error) {
        console.error("Failed to fetch documents", error);
      }
    }

    fetchDocuments();
  }, [email, department]);

  const startDate = startInput;
  const endDate = endInput;

  const filtered = documents.filter((doc) => {
    if (q) {
      const haystack = [
        doc.title,
        doc.deptTag,
        doc.owner,
        doc.category,
        doc.description,
      ]
        .join(" ")
        .toLowerCase();

      if (!haystack.includes(q)) return false;
    }

    if (accessFilter && doc.access !== accessFilter) return false;

    const localDate = toLocalDateString(doc.rawDate);

    if (startDate && localDate && localDate < startDate) return false;
    if (endDate && localDate && localDate > endDate) return false;

    return true;
  });

  // Pagination: แสดงเอกสารเป็นหน้า ๆ
  const pageSize = 9; // จำนวนเอกสารต่อหน้า
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedDocs = filtered.slice(startIndex, endIndex);

  // สร้างรายการเลขหน้าพร้อมจุดไข่ปลา ถ้าหน้าเยอะ
  const maxPageButtons = 5; // จำนวนปุ่มหน้า
  const pageItems: (number | string)[] = [];

  if (totalPages <= maxPageButtons) {
    for (let i = 1; i <= totalPages; i++) pageItems.push(i);
  } else {
    const windowSize = 3; // จำนวนหน้ารอบ ๆ หน้า current ที่จะแสดง
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

  function handleAccessFilterChange(nextAccess: string) {
    setAccessFilter(nextAccess);
    setCurrentPage(1);

    const params = new URLSearchParams();
    const qValue = qInput.trim();
    if (qValue) params.set("q", qValue);
    if (startInput) params.set("startDate", startInput);
    if (endInput) params.set("endDate", endInput);
    if (nextAccess) params.set("access", nextAccess);
    if (email) params.set("email", email);
    if (department) params.set("department", department);

    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search", { scroll: false });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const qValue = qInput.trim();
    const start = startInput;
    const end = endInput;

    const params = new URLSearchParams();
    if (qValue) params.set("q", qValue);
    if (start) params.set("startDate", start);
    if (end) params.set("endDate", end);
    if (accessFilter) params.set("access", accessFilter);
    if (email) params.set("email", email);
    if (department) params.set("department", department);

    const query = params.toString();
    setCurrentPage(1);
    router.push(query ? `/search?${query}` : "/search");
  }

  function handleReset() {
    setQInput("");
    setStartInput("");
    setEndInput("");
    setAccessFilter("");
    setCurrentPage(1);

    const params = new URLSearchParams();
    if (email) params.set("email", email);
    if (department) params.set("department", department);
    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  }

  function handleDownload(
    docTitle: string,
    allFileUrls: string[],
    originalNames?: string[]
  ) {
    if (!allFileUrls || allFileUrls.length === 0) {
      return;
    }

    if (allFileUrls.length === 1) {
      // กรณีมีไฟล์เดียว ดาวน์โหลดไฟล์เดียวตรง ๆ ไม่ต้องเป็น ZIP
      const singleUrl = allFileUrls[0];
      const baseName = (originalNames?.[0] || docTitle || "document").trim();
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
        singleUrl
      )}&filename=${encodeURIComponent(baseName)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // กรณีมีหลายไฟล์: ดาวน์โหลดเป็น ZIP เดียว (ใช้ลอจิกเดียวกับหน้า My Documents)
      const fileUrlsParam = encodeURIComponent(JSON.stringify(allFileUrls));
      const titleParam = encodeURIComponent(docTitle || "document");
      const originalNamesParam = encodeURIComponent(
        JSON.stringify(originalNames ?? [])
      );

      const downloadUrl = `/api/download-zip?fileUrls=${fileUrlsParam}&title=${titleParam}&originalNames=${originalNamesParam}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }

    setDownloadMessage(`ดาวน์โหลดเอกสาร "${docTitle}" เรียบร้อยแล้ว`);
    setTimeout(() => {
      setDownloadMessage(null);
    }, 2500);
  }

  function handleRequestDelete(doc: UiDocument) {
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

      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setConfirmDeleteDoc(null);
    } catch (err) {
      console.error("Delete error", err);
      window.alert("ไม่สามารถลบเอกสารได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  }

  const accessLabel =
    accessFilter === "team"
      ? " - แชร์ภายในหน่วยงาน"
      : accessFilter === "public"
      ? " - แชร์ทั้งองค์กร"
      : accessFilter === "private"
      ? " - แชร์ส่วนตัว"
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Header */}
      <UserNavbar />

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        {/* Filter panel */}
        <section className="rounded-2xl border border-indigo-100 bg-white px-6 py-4 text-xs shadow-sm">
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
                placeholder="ค้นหาจากชื่อเอกสาร , ฝ่าย/สถาบัน , เจ้าของ , คำอธิบาย"
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
          </form>

          <div className="mb-3 flex flex-wrap items-center gap-3">
            <span className="text-[11px] font-medium text-slate-700">
              ระดับการเข้าถึง :
            </span>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleAccessFilterChange("")}
                className={`rounded-full px-5 py-2 text-[11px] font-semibold outline-none transition-all duration-150 ${
                  accessFilter === ""
                    ? "border border-indigo-700 bg-indigo-700 text-white shadow-md hover:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5"
                    : "border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => handleAccessFilterChange("team")}
                className={`rounded-full px-5 py-2 text-[11px] font-medium outline-none transition-all duration-150 ${
                  accessFilter === "team"
                    ? "border border-indigo-700 bg-indigo-700 text-white shadow-md hover:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5"
                    : "border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                }`}
              >
                แชร์ภายในหน่วยงาน
              </button>
              <button
                type="button"
                onClick={() => handleAccessFilterChange("public")}
                className={`rounded-full px-5 py-2 text-[11px] font-medium outline-none transition-all duration-150 ${
                  accessFilter === "public"
                    ? "border border-indigo-700 bg-indigo-700 text-white shadow-md hover:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5"
                    : "border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                }`}
              >
                แชร์ทั้งองค์กร
              </button>
              <button
                type="button"
                onClick={() => handleAccessFilterChange("private")}
                className={`rounded-full px-5 py-2 text-[11px] font-medium outline-none transition-all duration-150 ${
                  accessFilter === "private"
                    ? "border border-indigo-700 bg-indigo-700 text-white shadow-md hover:bg-indigo-800 hover:shadow-lg hover:-translate-y-0.5"
                    : "border border-slate-300 bg-white text-slate-700 shadow-sm hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
                }`}
              >
                แชร์ส่วนตัว
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="group flex items-center gap-2 rounded-full bg-slate-900 px-5 py-1.5 text-[11px] font-semibold text-white shadow transition-transform duration-150 hover:-translate-y-0.5 hover:bg-black hover:shadow-lg"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-900 transition-transform duration-200 group-hover:scale-110">
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
                    <path d="M3 12a9 9 0 1 1 9 9" />
                    <path d="M3 4v8h8" />
                  </svg>
                </span>
                <span className="tracking-wide">รีเซ็ต</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section title */}
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-slate-800">
            เอกสารทั้งหมด ({filtered.length} รายการ{accessLabel})
          </span>
          {email && (
            <Link
              href={{
                pathname: "/my-documents",
                query: {
                  email,
                  department,
                },
              }}
              className="text-[12px] font-semibold hover:no-underline"
            >
              <span className="inline-flex items-center gap-2 rounded-full bg-rose-600 px-5 py-1.5 text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-lg">

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
                  <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <path d="M14 2v6h6" />
                </svg>
                <span>แก้ไขเอกสารของฉัน</span>
              </span>
            </Link>
          )}
        </div>

        {/* Cards grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {pagedDocs.map((doc, idx) => (
            <article
              key={`${doc.id}-${safeCurrentPage}-${idx}`}
              className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm transition-all duration-200 hover:-translate-y-1.5 hover:shadow-2xl ${doc.color}`}
            >

              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-600 text-white text-xl leading-none shadow-md transition-transform duration-200 group-hover:scale-110">

                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="h-6 w-6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                    <path d="M14 2v6h6" />
                  </svg>
                </div>

                <div className="flex flex-col gap-1 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-slate-900 transition-colors duration-200 group-hover:text-indigo-800">

                      {doc.title}
                    </h3>
                    {email && email === doc.owner && (
                      <button
                        type="button"
                        onClick={() => handleRequestDelete(doc)}
                        className="group flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-600 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-rose-100 hover:shadow-md"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 transition-transform duration-150 group-hover:scale-110"
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
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                      {doc.deptTag}
                    </span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                      {doc.category}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${
                        doc.access === "public"
                          ? "bg-emerald-100 text-emerald-800"
                          : doc.access === "team"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {doc.access === "public" && (
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
                          <circle cx="12" cy="12" r="10" />
                          <path d="M2 12h20" />
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                        </svg>
                      )}
                      {doc.access === "team" && (
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
                          <circle cx="9" cy="7" r="3" />
                          <circle cx="17" cy="7" r="3" />
                          <path d="M2 21v-1a4 4 0 0 1 4-4h6" />
                          <path d="M22 21v-1a4 4 0 0 0-4-4h-3" />
                        </svg>
                      )}
                      {doc.access === "private" && (
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
                          <rect x="4" y="10" width="16" height="10" rx="2" />
                          <path d="M8 10V8a4 4 0 0 1 8 0v2" />
                          <circle cx="12" cy="15" r="1" />
                        </svg>
                      )}
                      <span>
                        {doc.access === "public"
                          ? "แชร์ทั้งองค์กร"
                          : doc.access === "team"
                          ? "แชร์ภายในหน่วยงาน"
                          : "แชร์ส่วนตัว"}
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-3 space-y-1 text-[11px] text-slate-700">
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                  <span className="flex h-5 w-5 items-center justify-center text-slate-500">
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
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                      <line x1="8" y1="4" x2="8" y2="2" />
                      <line x1="16" y1="4" x2="16" y2="2" />
                    </svg>
                  </span>
                  <span className="text-[11px]">{doc.date}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                  <span className="flex h-5 w-5 items-center justify-center text-slate-500">
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
                      <path d="M4 20h4l10-10-4-4L4 16v4z" />
                      <path d="M14 6l4 4" />
                    </svg>
                  </span>
                  <span className="text-[11px]">
                    {doc.editedDisplay
                      ? `แก้ไขล่าสุด ${doc.editedDisplay}`
                      : "แก้ไขล่าสุด - ขณะนี้ยังไม่มีข้อมูลการแก้ไข"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                  <span className="flex h-5 w-5 items-center justify-center text-slate-500">
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
                      <circle cx="12" cy="7" r="4" />
                      <path d="M5.5 21a7.5 7.5 0 0 1 13 0" />
                    </svg>
                  </span>
                  <span className="text-[11px]">{doc.owner}</span>
                </div>
              </div>

              <div className="mt-auto flex flex-col items-stretch gap-2 text-[11px] font-medium">
                <div className="flex justify-center gap-2">
                  <Link
                    href={{
                      pathname: "/detail",
                      query: {
                        id: String(doc.id),
                        title: doc.title,
                        owner: doc.owner,
                        created: doc.date,
                        edited: doc.editedDisplay,
                        department: doc.deptTag,
                        category: doc.category,
                        tags: `${doc.category} ${doc.deptTag}`,
                        description: doc.description,
                        fileUrl: doc.fileUrl,
                        fileUrls: JSON.stringify(doc.allFileUrls),
                        originalNames: JSON.stringify(doc.originalNames),
                        email,
                      },
                    }}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-lg"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-emerald-700 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
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
                    <span className="tracking-wide">รายละเอียด</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc.title, doc.allFileUrls, doc.originalNames)}
                    className="group inline-flex items-center justify-center gap-2 rounded-full bg-indigo-700 px-4 py-1.5 text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-lg"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white text-indigo-700 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
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
                        <path d="M12 3v12" />
                        <path d="M8 11l4 4 4-4" />
                        <rect x="4" y="15" width="16" height="4" rx="1" />
                      </svg>
                    </span>
                    <span className="tracking-wide">ดาวน์โหลดเอกสาร</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[11px]">
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
                      ? "border-indigo-700 bg-indigo-700 text-white"
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
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100 text-rose-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="13" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
              </span>
              <h2 className="text-base font-semibold text-rose-700">
                ยืนยันการลบเอกสาร
              </h2>
            </div>
            <p className="mb-6 text-[13px] text-slate-700">
              คุณต้องการลบเอกสาร "{confirmDeleteDoc.title}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3 text-[13px]">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="group flex items-center gap-2 rounded-full border border-slate-300 bg-white px-7 py-2 font-medium text-slate-700 shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-lg disabled:opacity-60"
                disabled={deletingId === confirmDeleteDoc.id}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-slate-600 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
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
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </span>
                <span className="whitespace-nowrap">ยกเลิก</span>
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="group flex items-center gap-2 rounded-full bg-rose-600 px-7 py-2 font-semibold text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-lg disabled:opacity-60"
                disabled={deletingId === confirmDeleteDoc.id}
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-rose-600 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-6">
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
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </span>
                <span className="whitespace-nowrap">
                  {deletingId === confirmDeleteDoc.id ? "กำลังลบ..." : "ยืนยันการลบ"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Download success popup */}
      {downloadMessage && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-xs text-white shadow-lg">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-3 w-3 text-white"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span>{downloadMessage}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-[11px] text-indigo-900">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4">
          <div className="flex items-center">
            <img
              src="/fti-logo.png"
              alt="FTI"
              className="h-14 w-auto"
            />
          </div>

          <div className="mx-auto flex flex-col items-center text-center text-[11px] leading-snug text-slate-700">
            <span> 2025 จัดทำโดย ฝ่ายดิจิทัลและเทคโนโลยี สภาอุตสาหกรรมแห่งประเทศไทย</span>
            <span>จัดทำโดย นางสาวกัลยรักษ์ โรจนเลิศประเสริฐ</span>
            <span>นักศึกษาฝึกงาน มหาวิทยาลัยพะเยา</span>
          </div>
        </div>
      </footer>
    </div>
  );
}