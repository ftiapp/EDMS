"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

type DbDocument = {
  id: number;
  title: string;
  department: string;
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

  const [qInput, setQInput] = useState(initialQ);
  const [startInput, setStartInput] = useState(initialStart);
  const [endInput, setEndInput] = useState(initialEnd);
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null);
  const [documents, setDocuments] = useState<UiDocument[]>([]);
  const [accessFilter, setAccessFilter] = useState(initialAccess);

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

  useEffect(() => {
    async function fetchDocuments() {
      try {
        const res = await fetch("/api/documents");
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

          // แปลง edited_at เป็นข้อความภาษาไทย (ถ้ามี)
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
            console.log(`📄 ${doc.title}: Raw="${doc.access_level}" → Normalized="${normalizedAccess}"`);
          }

          return {
            id: doc.id,
            title: doc.title,
            deptTag: doc.department,
            category: doc.tags || "",
            date: displayDate,
            rawDate,

            owner: "",
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
  }, []);

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

    if (startDate && doc.rawDate && doc.rawDate.slice(0, 10) < startDate)
      return false;
    if (endDate && doc.rawDate && doc.rawDate.slice(0, 10) > endDate)
      return false;

    return true;
  });

  // ฟังก์ชันสำหรับเปลี่ยน access filter แบบเรียลไทม์
  function handleAccessFilterChange(nextAccess: string) {
    setAccessFilter(nextAccess);
    
    const params = new URLSearchParams();
    const qValue = qInput.trim();
    if (qValue) params.set("q", qValue);
    if (startInput) params.set("startDate", startInput);
    if (endInput) params.set("endDate", endInput);
    if (nextAccess) params.set("access", nextAccess);
    
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

    const query = params.toString();
    router.push(query ? `/search?${query}` : "/search");
  }

  function handleReset() {
    setQInput("");
    setStartInput("");
    setEndInput("");
    setAccessFilter("");
    router.push("/search");
  }

  function handleDownload(
    docTitle: string,
    allFileUrls: string[],
    _originalNames?: string[]
  ) {
    if (allFileUrls.length === 1) {
      const singleUrl = allFileUrls[0];
      const singleName = _originalNames?.[0] || docTitle || "document";
      const downloadUrl = `/api/download?fileUrl=${encodeURIComponent(
        singleUrl
      )}&filename=${encodeURIComponent(singleName)}`;

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else if (allFileUrls.length > 1) {
      const fileUrlsParam = encodeURIComponent(JSON.stringify(allFileUrls));
      const titleParam = encodeURIComponent(docTitle || "document");
      const namesParam = encodeURIComponent(JSON.stringify(_originalNames ?? []));

      // กรณีดาวน์โหลด ZIP เดียว: ใช้ title เป็นชื่อ ZIP และส่ง originalNames ไปให้ตั้งชื่อไฟล์ข้างใน (ถ้ามี)
      const downloadUrl = `/api/download-zip?fileUrls=${fileUrlsParam}&title=${titleParam}&originalNames=${namesParam}`;

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

  const accessLabel =
    accessFilter === "team"
      ? " - แชร์กันในทีม"
      : accessFilter === "public"
      ? " - สาธารณะ"
      : accessFilter === "private"
      ? " - ส่วนตัว"
      : "";

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
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
            <span className="rounded-full bg-white px-4 py-1.5 text-indigo-800 shadow-sm">
              Search
            </span>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        {/* Filter panel */}
        <section className="rounded-2xl border border-indigo-100 bg-white px-6 py-4 text-xs shadow-sm">

          <form
            className="mb-3 flex flex-wrap items-end gap-3"
            onSubmit={handleSubmit}
          >
            <div className="flex flex-1 min-w-[200px] items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">

              <span className="text-lg">🔍</span>
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
                className="min-w-[160px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm text-slate-700"

              />
            </div>
            <div className="flex flex-col gap-1 text-[11px] text-slate-700">
              <span>วันที่สิ้นสุด</span>
              <input
                type="date"
                name="endDate"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="min-w-[160px] rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs shadow-sm text-slate-700"

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
                className={`rounded-full px-4 py-1.5 text-[11px] font-semibold shadow-sm border outline-none transition-colors ${
                  accessFilter === ""
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                ทั้งหมด
              </button>
              <button
                type="button"
                onClick={() => handleAccessFilterChange("team")}
                className={`rounded-full border px-4 py-1.5 text-[11px] font-medium outline-none transition-colors ${
                  accessFilter === "team"
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                แชร์กันในทีม
              </button>
              <button
                type="button"
                onClick={() => handleAccessFilterChange("public")}
                className={`rounded-full border px-4 py-1.5 text-[11px] font-medium outline-none transition-colors ${
                  accessFilter === "public"
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                สาธารณะ
              </button>
              <button
                type="button"
                onClick={() => handleAccessFilterChange("private")}
                className={`rounded-full border px-4 py-1.5 text-[11px] font-medium outline-none transition-colors ${
                  accessFilter === "private"
                    ? "border-indigo-700 bg-indigo-700 text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                ส่วนตัว
              </button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-1.5 text-[11px] font-semibold text-white shadow hover:bg-slate-900"
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                  ↺
                </span>
                <span>รีเซ็ต</span>
              </button>
            </div>
          </div>
        </section>

        {/* Section title */}
        <div className="flex items-baseline justify-between text-xs">
          <span className="font-semibold text-slate-800">
            เอกสารทั้งหมด ({filtered.length} รายการ{accessLabel})
          </span>
        </div>

        {/* Cards grid */}
        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((doc, idx) => (
            <article
              key={`${doc.id}-${idx}`}
              className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm ${doc.color}`}
            >
              <div className="mb-3 flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white text-xl leading-none shadow-md">
                  📄
                </div>

                <div className="flex flex-col gap-1">
                  <h3 className="text-sm font-semibold text-slate-900">
                    {doc.title}
                  </h3>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-indigo-700">
                      {doc.deptTag}
                    </span>
                    <span className="rounded-full bg-rose-100 px-2 py-0.5 text-rose-700">
                      {doc.category}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 ${
                        doc.access === "public"
                          ? "bg-emerald-100 text-emerald-700"
                          : doc.access === "team"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {doc.access === "public"
                        ? "🌐 สาธารณะ"
                        : doc.access === "team"
                        ? "👥 แชร์กันในทีม"
                        : "🔒 ส่วนตัว"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mb-3 space-y-1 text-[11px] text-slate-700">
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                  <span className="text-xs text-slate-500">📅</span>
                  <span className="text-[11px]">{doc.date}</span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                  <span className="text-xs text-slate-500">✏️</span>
                  <span className="text-[11px]">
                    {doc.editedDisplay
                      ? `แก้ไขล่าสุด ${doc.editedDisplay}`
                      : "แก้ไขล่าสุด - ขณะนี้ยังไม่มีข้อมูลการแก้ไข"}
                  </span>
                </div>
                <div className="flex items-center gap-2 rounded-full bg-slate-50 px-2 py-1">
                  <span className="text-xs text-slate-500">👤</span>
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
                      },
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-600 px-4 py-1.5 text-white hover:bg-emerald-700"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                      👁️
                    </span>
                    <span>รายละเอียด</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleDownload(doc.title, doc.allFileUrls, doc.originalNames)}
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-indigo-700 px-4 py-1.5 text-white hover:bg-indigo-800"
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                      📥
                    </span>
                    <span>ดาวน์โหลดเอกสาร</span>
                  </button>
                </div>
                <Link
                  href={{
                    pathname: "/edit",
                    query: {
                      id: String(doc.id),
                      title: doc.title,
                      department: doc.deptTag,
                      tags: doc.category,
                      description: doc.description,
                    },
                  }}
                  className="inline-flex w-full items-center justify-center gap-1 rounded-full bg-slate-700 px-3 py-1.5 text-[11px] text-white hover:bg-slate-800"
                >
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 text-[10px]">
                    ✏️
                  </span>
                  <span>แก้ไขเอกสารนี้</span>
                </Link>
              </div>
            </article>
          ))}
        </section>
      </main>

      {/* Download success popup */}
      {downloadMessage && (
        <div className="fixed left-1/2 top-4 z-50 -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-full bg-emerald-500 px-4 py-2 text-xs text-white shadow-lg">
            <span>✅</span>
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
              className="h-8 w-auto"
            />
          </div>

          <div className="mx-auto flex flex-col items-center text-center text-[11px] leading-snug text-slate-700">
            <span>© 2025 จัดทำโดย ฝ่ายดิจิทัลและเทคโนโลยีสารสนเทศ สภาอุตสาหกรรมแห่งประเทศไทย</span>
            <span>จัดทำโดย นางสาวกัลยรักษ์ โรจนเลิศประเสริฐ</span>
            <span>นิสิตฝึกงาน มหาวิทยาลัยพะเยา</span>
          </div>
        </div>
      </footer>
    </div>
  );
}