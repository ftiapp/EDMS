"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { formatThaiDateTime } from "@/lib/datetime";

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
  displayDate: string;
  editedDisplay: string | null;
  department: string;
  category: string;
  tags: string;
  description: string;
  allFileUrls: string[];
  originalNames: string[];
};

function AdminDocumentDetailPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [detail, setDetail] = useState<DetailState | null>(null);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);

  const idParam = searchParams.get("id");

  function formatThaiEdited(editedAt: string | null | undefined): string | null {
    if (!editedAt) return null;
    const s = formatThaiDateTime(editedAt);
    return s === "ไม่พบวันที่บันทึกเอกสาร" ? null : s;
  }

  useEffect(() => {
    if (!idParam) return;

    const numericId = Number(idParam);
    if (!Number.isFinite(numericId)) return;

    const fetchFromDb = async () => {
      try {
        // ใช้ API ฝั่งแอดมินเพื่อให้เห็นเอกสารทั้งหมดที่ผู้ดูแลระบบเข้าถึงได้
        const res = await fetch("/api/admin/documents");
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

        setDetail({
          title: dbDoc.title || "ไม่พบชื่อเอกสาร",
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
      } catch {}
    };

    fetchFromDb();
  }, [idParam]);

  if (!idParam) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
        ไม่พบรหัสเอกสารสำหรับการแสดงรายละเอียด
      </div>
    );
  }

  const title = detail?.title ?? "กำลังโหลดข้อมูลเอกสาร";
  const displayDate = detail?.displayDate ?? "-";
  const editedDisplay = detail?.editedDisplay ?? null;
  const department = detail?.department ?? "-";
  const category = detail?.category ?? "-";
  const tags = detail?.tags ?? "-";
  const description =
    detail?.description ??
    "คำอธิบายเอกสารจะแสดงในส่วนนี้เมื่อเชื่อมต่อกับข้อมูลจริงแล้ว";
  const allFileUrls = detail?.allFileUrls ?? [];
  const originalNames = detail?.originalNames ?? [];

  function handleDownload() {
    if (allFileUrls.length === 0) return;

    if (allFileUrls.length === 1) {
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
    } else {
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

  return (
    <div className="space-y-4">
      {downloadMessage && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-[11px] text-emerald-800">
          {downloadMessage}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white px-6 py-5 text-xs shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-800">
            <span className="text-indigo-600">
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
            <h1 className="text-lg font-semibold text-slate-900">
              {title}
            </h1>
          </div>
          <button
            type="button"
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-full bg-indigo-700 px-4 py-2 text-[11px] font-medium text-white shadow hover:bg-indigo-800"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-[11px] text-indigo-700">
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
            <span>ดาวน์โหลดเอกสารทั้งหมด</span>
          </button>
        </div>

        <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 px-4 py-4 text-[11px] text-slate-800">
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">วันที่บันทึกเอกสาร</div>
              <p className="text-slate-700">{displayDate}</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">แก้ไขล่าสุด</div>
              <p className="text-slate-700">
                {editedDisplay || "ขณะนี้ยังไม่มีข้อมูลการแก้ไข"}
              </p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">หมวดหมู่ / ประเภทเอกสาร</div>
              <p className="text-slate-700">{category}</p>
            </div>
            <div className="space-y-1">
              <div className="font-semibold text-slate-900">หน่วยงาน / สถาบัน</div>
              <p className="text-slate-700">{department}</p>
            </div>
            <div className="space-y-1 md:col-span-2">
              <div className="font-semibold text-slate-900">คำสำคัญ (Tags)</div>
              <p className="text-slate-700">{tags}</p>
            </div>
          </div>
        </div>

        <div className="mb-4 space-y-2 rounded-xl border border-slate-200 bg-white px-4 py-4 text-[11px] text-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            รายละเอียดเอกสาร
          </h2>
          <p className="text-slate-700">{description}</p>
        </div>

        <div className="mb-4 space-y-3 text-[11px] text-slate-800">
          <h2 className="mb-2 text-sm font-semibold text-slate-900">
            ไฟล์แนบเอกสาร
          </h2>

          {allFileUrls.length > 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-700 shadow-sm">
              <div className="mb-2 font-semibold text-slate-900">
                ไฟล์แนบทั้งหมด ({allFileUrls.length} ไฟล์)
              </div>
              <ul className="space-y-2">
                {[...allFileUrls].slice().reverse().map((url, index) => {
                  const reversedIndex = allFileUrls.length - 1 - index;
                  const defaultName = `${title || "document"}-ไฟล์ที่-${
                    reversedIndex + 1
                  }`;
                  const originalNameRaw = originalNames[reversedIndex] ?? "";
                  const originalName = originalNameRaw.trim();
                  const nameForType = (originalName || url).toLowerCase();

                  const isPdf = nameForType.endsWith(".pdf");
                  const isDoc =
                    nameForType.endsWith(".doc") ||
                    nameForType.endsWith(".docx");
                  const displayName = originalName || `ไฟล์ที่ ${index + 1}`;

                  const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
                    url
                  )}&filename=${encodeURIComponent(
                    originalName || defaultName
                  )}`;

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
                          <span className="truncate text-slate-700">
                            {displayName}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          {!isDoc && (
                            <a
                              href={previewUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full bg-slate-700 px-4 py-1.5 text-[11px] font-medium text-white shadow-sm hover:bg-slate-800"
                            >
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-700 text-[10px]">
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
                                  <path d="M16 16 4 4" />
                                </svg>
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
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-700 text-[10px]">
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
      </section>
    </div>
  );
}

export default function AdminDocumentDetailPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-700">
          กำลังโหลดรายละเอียดเอกสาร...
        </div>
      }
    >
      <AdminDocumentDetailPageInner />
    </Suspense>
  );
}