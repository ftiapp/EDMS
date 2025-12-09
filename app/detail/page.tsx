"use client";

import Link from "next/link";
import UserNavbar from "../components/UserNavbar";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type DbDocument = {
  id: number;
  title: string;
  department: string;
  owner_email?: string | null;
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
  accessLabel: string;
};

export default function DocumentDetailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deleteMessage, setDeleteMessage] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailState | null>(null);

  const idParam = searchParams.get("id");
  const email = (searchParams.get("email") ?? "").trim();
  const token = (searchParams.get("token") ?? "").trim();

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

    function formatAccessLabel(raw: string | null | undefined): string {
      const value = (raw ?? "").toString().toLowerCase().trim();
      if (!value) return "แชร์ส่วนตัว";

      if (value.includes("team") || value.includes("ทีม")) {
        return "แชร์ภายในหน่วยงาน";
      }
      if (value.includes("public") || value.includes("สาธารณะ")) {
        return "แชร์ทั้งองค์กร";
      }
      if (value.includes("private") || value.includes("ส่วนตัว")) {
        return "แชร์ส่วนตัว";
      }
      return value;
    }

    const fetchFromDb = async () => {
      try {
        const params = new URLSearchParams();
        if (email) {
          params.set("email", email);
        }
        const queryString = params.toString();
        const res = await fetch(
          queryString ? `/api/documents?${queryString}` : "/api/documents"
        );
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
          owner: dbDoc.owner_email || "ไม่ระบุผู้บันทึก",
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
          accessLabel: formatAccessLabel(dbDoc.access_level),
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
  const accessParam = searchParams.get("access");
  const accessLabelFromQuery = (() => {
    const value = (accessParam ?? "").toString().toLowerCase().trim();
    if (!value) return "แชร์ส่วนตัว";
    if (value.includes("team") || value.includes("ทีม")) return "แชร์ภายในหน่วยงาน";
    if (value.includes("public") || value.includes("สาธารณะ")) return "แชร์ทั้งองค์กร";
    if (value.includes("private") || value.includes("ส่วนตัว")) return "แชร์ส่วนตัว";
    return value;
  })();
  let accessLabel = accessLabelFromQuery;

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
    accessLabel = detail.accessLabel;
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
        const params = new URLSearchParams();
        params.set("id", idParam);
        if (email) params.set("email", email);
        const res = await fetch(`/api/documents?${params.toString()}`, {
          method: "DELETE",
        });

        if (!res.ok) {
          throw new Error("Delete failed");
        }

        setDeleteMessage(`ดำเนินการลบเอกสาร "${title}" สำเร็จแล้ว`);
        setTimeout(() => {
          setDeleteMessage(null);
          const params = new URLSearchParams();
          if (email) params.set("email", email);
          if (token) params.set("token", token);
          const query = params.toString();
          router.push(query ? `/search?${query}` : "/search");
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
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Header */}
      <UserNavbar />

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        <section className="rounded-2xl border border-indigo-100 bg-white px-8 py-6 text-xs shadow-sm md:px-10 md:py-8">
          {/* Title row */}
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-rose-700">
              <span className="text-rose-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="inline-block h-4 w-4 align-middle"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                  <path d="M14 2v6h6" />
                </svg>
              </span>
              <h1 className="text-lg font-semibold">{title}</h1>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="group flex items-center gap-3 rounded-full bg-indigo-700 px-7 py-2.5 text-[12px] font-semibold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-xl"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-indigo-700 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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

          {/* Meta info */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-4 text-[11px] text-slate-800 shadow-sm">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-[13px] text-slate-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="inline-block h-4 w-4 align-middle"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M3 3v18h18" />
                  <rect x="6" y="13" width="3" height="6" rx="0.75" />
                  <rect x="11" y="9" width="3" height="10" rx="0.75" />
                  <rect x="16" y="6" width="3" height="13" rx="0.75" />
                </svg>
              </span>
              <span>ข้อมูลสรุปของเอกสาร</span>
            </h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-1">
                <div className="flex itemscenter gap-2 font-semibold">
                  <span className="text-[13px] text-slate-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="inline-block h-3.5 w-3.5 align-middle"
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
                  <span>วันที่บันทึกเอกสาร</span>
                </div>
                <p className="text-slate-700">{displayDate}</p>
              </div>
              <div className="space-y-1">
                <div className="flex itemscenter gap-2 font-semibold">
                  <span className="text-[13px] text-slate-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="inline-block h-4 w-4 align-middle"
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
                  <span>แก้ไขล่าสุด</span>
                </div>
                <p className="text-slate-700">
                  {editedDisplay || "ขณะนี้ยังไม่มีข้อมูลการแก้ไข"}
                </p>
              </div>
              <div className="space-y-1">
                <div className="flex itemscenter gap-2 font-semibold">
                  <span className="text-[13px] text-slate-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="inline-block h-4 w-4 align-middle"
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
                  <span>ผู้บันทึกเอกสาร</span>
                </div>
                <p className="text-slate-700">{owner}</p>
              </div>
              <div className="space-y-1">
                <div className="flex itemscenter gap-2 font-semibold">
                  <span className="text-[13px] text-slate-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="inline-block h-4 w-4 align-middle"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M12 2 4.5 5v6c0 4.3 3 8.2 7.5 9 4.5-.8 7.5-4.7 7.5-9V5L12 2Z" />
                      <circle cx="12" cy="11" r="2.5" />
                      <path d="M12 13.5V16" />
                    </svg>
                  </span>
                  <span>ระดับการเข้าถึง</span>
                </div>
                <p className="text-slate-700">{accessLabel}</p>
              </div>
              <div className="space-y-1">
                <div className="flex itemscenter gap-2 font-semibold">
                  <span className="text-[13px] text-slate-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="inline-block h-4 w-4 align-middle"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 21V7a2 2 0 0 1 2-2h4v16" />
                      <path d="M13 21V3h4a2 2 0 0 1 2 2v16" />
                      <path d="M5 11h4" />
                      <path d="M5 15h4" />
                      <path d="M13 7h4" />
                      <path d="M13 11h4" />
                    </svg>
                  </span>
                  <span>หน่วยงาน / สถาบัน</span>
                </div>
                <p className="text-slate-700">{department}</p>
              </div>
              <div className="space-y-1 md:col-span-2">
                <div className="flex itemscenter gap-2 font-semibold">
                  <span className="text-[13px] text-slate-700">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      className="inline-block h-4 w-4 align-middle"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M4 9h16" />
                      <path d="M4 15h16" />
                      <path d="M10 3 8 21" />
                      <path d="M16 3l-2 18" />
                    </svg>
                  </span>
                  <span>คำสำคัญ (Tags)</span>
                </div>
                <p className="text-slate-700">{tags}</p>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-[11px] text-slate-800 shadow-sm">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-[13px] text-slate-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="inline-block h-3.5 w-3.5 align-middle"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l7 7v9a2 2 0 0 1-2 2Z" />
                  <path d="M17 21v-8H9" />
                </svg>
              </span>
              <span>รายละเอียดเอกสาร</span>
            </h2>
            <p className="text-slate-700">{description}</p>
          </div>

          {/* Attachments list only */}
          <div className="mb-6 space-y-3 text-[11px] text-slate-800">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <span className="text-[13px] text-slate-700">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  className="inline-block h-4 w-4 align-middle"
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
                            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-slate-100 text-[11px] text-slate-700">
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
                                <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" />
                                <path d="M14 2v6h6" />
                              </svg>
                            </span>
                            <span className="truncate text-slate-700">{displayName}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            {!isDoc && (
                              <a
                                href={previewUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="group inline-flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-[11px] font-medium text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-900 hover:shadow-lg"
                              >
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-800 text-[10px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                                    <circle cx="11" cy="11" r="5" />
                                    <path d="m16 16 4 4" />
                                  </svg>
                                </span>
                                <span className="tracking-wide">เปิดดูไฟล์</span>
                              </a>
                            )}
                            <a
                              href={downloadUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="group inline-flex items-center gap-2 rounded-full bg-indigo-700 px-4 py-1.5 text-[11px] font-medium text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-lg"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-700 text-[10px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                                  <path d="M12 3v12" />
                                  <path d="M8 11l4 4 4-4" />
                                  <rect x="4" y="15" width="16" height="4" rx="1" />
                                </svg>
                              </span>
                              <span className="tracking-wide">ดาวน์โหลดเอกสาร</span>
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

          {/* Danger zone - ปิดการใช้งานปุ่มลบในหน้า Detail (ลบจากการ์ดแทน) */}
        </section>
      </main>

      {/* Confirm delete modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white px-8 py-6 text-sm text-slate-800 shadow-2xl">
            <h2 className="mb-3 text-base font-semibold text-rose-700">
              ยืนยันการลบเอกสาร
            </h2>
            <p className="mb-6 text-[13px] text-slate-700">
              คุณต้องการลบเอกสาร "{title}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3 text-[13px]">
              <button
                type="button"
                onClick={handleCancelDelete}
                className="group flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-7 py-2 font-medium text-slate-800 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:shadow-md"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-indigo-600 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                className="group flex items-center gap-2 rounded-full bg-rose-600 px-7 py-2 font-semibold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-rose-600 transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                <span className="whitespace-nowrap">ยืนยันการลบ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete message banner */}
      {deleteMessage && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4">
          <div className="max-w-md rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-[11px] text-rose-800 shadow-lg">
            {deleteMessage}
          </div>
        </div>
      )}
    </div>
  );
}
