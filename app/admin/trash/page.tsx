"use client";

import { useEffect, useState } from "react";

interface TrashDocument {
  id: number;
  title: string;
  department: string | null;
  tags: string | null;
  access_level: string | null;
  created_at: string;
  edited_at?: string | null;
}

export default function AdminTrashPage() {
  const [documents, setDocuments] = useState<TrashDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<number | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTrash() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/documents/trash");
        if (!res.ok) throw new Error("Failed to fetch trash");
        const data = await res.json();
        setDocuments((data.documents || []) as TrashDocument[]);
      } catch (err) {
        console.error("Admin trash fetch error", err);
        setError("ไม่สามารถดึงรายการเอกสารถูกลบได้");
      } finally {
        setIsLoading(false);
      }
    }

    fetchTrash();
  }, []);

  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => {
      setSuccessBanner(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  const q = searchInput.toLowerCase().trim();
  const filteredDocs = documents.filter((doc) => {
    if (!q) return true;
    const haystack = [
      doc.title || "",
      doc.department || "",
      doc.tags || "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const pageSize = 50;
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedDocs = filteredDocs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  const handleRestore = async (id: number) => {
    try {
      setRestoringId(id);
      setError(null);
      const res = await fetch("/api/documents/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        throw new Error("Failed to restore document");
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setSuccessBanner("กู้คืนเอกสารเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Admin restore document error", err);
      setError("ไม่สามารถกู้คืนเอกสารได้");
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <div className="space-y-4">
      {successBanner && (
        <div className="fixed inset-x-0 top-16 z-40 flex justify-center px-4">
          <div className="flex max-w-md items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-[11px] text-emerald-700 shadow-lg">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/80">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="h-3 w-3 text-emerald-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span>{successBanner}</span>
          </div>
        </div>
      )}

      <section className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">
          ถังขยะเอกสาร (Trash)
        </h1>
        <p className="text-[11px] text-slate-600">
          แสดงรายการเอกสารที่ถูกลบออกจากระบบ แต่ยังสามารถกู้คืนกลับมาใช้งานได้
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
          <input
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="ค้นหาจากชื่อเอกสาร , ฝ่าย/สถาบัน , แท็ก"
            className="min-w-[220px] flex-1 rounded-full border border-slate-300 px-3 py-1.5 text-[11px] text-slate-700 shadow-sm"
          />

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePageChange(safePage - 1)}
              className="rounded-full border border-slate-300 px-3 py-1 text-[10px] text-slate-700 disabled:opacity-40"
              disabled={safePage <= 1}
            >
              ก่อนหน้า
            </button>
            <span className="text-[10px] text-slate-600">
              หน้า {safePage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => handlePageChange(safePage + 1)}
              className="rounded-full border border-slate-300 px-3 py-1 text-[10px] text-slate-700 disabled:opacity-40"
              disabled={safePage >= totalPages}
            >
              ถัดไป
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600 shadow-sm">
          กำลังโหลดรายการเอกสารถูกลบ...
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600 shadow-sm">
          ยังไม่มีเอกสารถูกลบในถังขยะ
        </div>
      ) : (
        <ul className="space-y-2 text-[11px]">
          {pagedDocs.map((doc) => {
            const deletedDate = (doc.edited_at || doc.created_at || "-").slice(0, 10);
            const accessLabel = (doc.access_level || "").toLowerCase();

            let accessText = "-";
            let accessColorClass = "";
            if (accessLabel.includes("team")) {
              accessText = "แชร์ภายในหน่วยงาน";
              accessColorClass = "bg-sky-100 text-sky-800";
            } else if (accessLabel.includes("public")) {
              accessText = "แชร์ทั้งองค์กร";
              accessColorClass = "bg-emerald-100 text-emerald-800";
            } else if (accessLabel) {
              accessText = "แชร์ส่วนตัว";
              accessColorClass = "bg-amber-100 text-amber-800";
            }

            return (
              <li
                key={doc.id}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 flex-none items-center justify-center rounded-full bg-rose-600 text-white shadow">
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
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <line x1="10" y1="11" x2="10" y2="17" />
                        <line x1="14" y1="11" x2="14" y2="17" />
                      </svg>
                    </span>

                    <div className="min-w-0 space-y-1">
                      <div className="truncate font-semibold text-slate-900">
                        {doc.title}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                        <span className="max-w-[180px] truncate rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                          {doc.department || "ไม่ระบุฝ่าย"}
                        </span>
                        <span className="max-w-[180px] truncate rounded-full bg-slate-50 px-2 py-0.5 text-slate-600">
                          {doc.tags || "-"}
                        </span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-medium text-rose-700">
                          ลบเมื่อ {deletedDate}
                        </span>
                        {accessText !== "-" && accessColorClass && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${accessColorClass}`}
                          >
                            {accessText}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    <button
                      type="button"
                      onClick={() => handleRestore(doc.id)}
                      className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-600 px-4 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-60"
                      disabled={restoringId === doc.id}
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
                        <path d="M3 12a9 9 0 1 1 9 9" />
                        <path d="M3 4v8h8" />
                      </svg>
                      <span>
                        {restoringId === doc.id ? "กำลังกู้คืน..." : "กู้คืนเอกสาร"}
                      </span>
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
