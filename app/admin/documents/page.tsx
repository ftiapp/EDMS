"use client";

import { useEffect, useState } from "react";

interface DbDocument {
  id: number;
  title: string;
  department: string | null;
  tags: string | null;
  description: string | null;
  access_level: string | null;
  file_url: string;
  created_at: string;
  edited_at?: string | null;
  original_filenames?: string | null;
}

export default function AdminDocumentsPage() {
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [globalLoadingMessage, setGlobalLoadingMessage] = useState<string | null>(
    null
  );
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DbDocument | null>(
    null
  );
  const [editForm, setEditForm] = useState({
    title: "",
    department: "",
    access_level: "private",
    description: "",
  });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [existingFilesMap, setExistingFilesMap] = useState<
    Record<number, { url: string; name: string }[]>
  >({});
  const [searchInput, setSearchInput] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const formatThaiDateTime = (raw: string | null | undefined): string => {
    if (!raw) return "-";
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
  };

  useEffect(() => {
    if (!successBanner) return;
    const timer = setTimeout(() => {
      setSuccessBanner(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [successBanner]);

  useEffect(() => {
    async function fetchAll() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/admin/documents");
        if (!res.ok) throw new Error("Failed to fetch documents");
        const data = await res.json();
        const docs = (data.documents || []) as DbDocument[];
        setDocuments(docs);
      } catch (err) {
        console.error("Admin all documents fetch error", err);
        setError("ไม่สามารถดึงข้อมูลเอกสารได้");
      } finally {
        setIsLoading(false);
      }
    }

    fetchAll();
  }, []);

  const startEdit = (doc: DbDocument) => {
    setEditingId(doc.id);
    setEditForm({
      title: doc.title || "",
      department: doc.department || "",
      access_level: (doc.access_level || "private").toString(),
      description: doc.description || "",
    });
    setActionError(null);
    setActionSuccess(null);
    setSelectedFiles([]);

    // เตรียมข้อมูลไฟล์เดิมของเอกสาร สำหรับให้แอดมินจัดการได้เหมือนหน้าผู้ใช้
    try {
      let urls: string[] = [];
      let names: string[] = [];

      if (doc.file_url) {
        try {
          const parsed = JSON.parse(doc.file_url);
          if (Array.isArray(parsed)) {
            urls = parsed.filter((u): u is string => typeof u === "string");
          }
        } catch {
          if (typeof doc.file_url === "string") {
            urls = [doc.file_url];
          }
        }
      }

      if (doc.original_filenames) {
        try {
          const parsedNames = JSON.parse(doc.original_filenames);
          if (Array.isArray(parsedNames)) {
            names = parsedNames.filter(
              (n): n is string => typeof n === "string" && n.length > 0
            );
          }
        } catch {
          // ignore ถ้า parse ไม่ได้
        }
      }

      const combined = urls.map((url, idx) => ({
        url,
        name: names[idx] || `ไฟล์ที่ ${idx + 1}`,
      }));

      setExistingFilesMap((prev) => ({
        ...prev,
        [doc.id]: combined,
      }));
    } catch {
      // ถ้ามีปัญหาให้ปล่อยว่าง ไม่ให้กระทบการแก้ไขอื่น
      setExistingFilesMap((prev) => ({
        ...prev,
        [doc.id]: prev[doc.id] || [],
      }));
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setActionError(null);
    setSelectedFiles([]);
  };

  const handleChange = (
    field: "title" | "department" | "access_level" | "description",
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async (id: number, tags: string | null) => {
    const title = editForm.title.trim();
    const department = editForm.department.trim();
    const access_level = editForm.access_level.trim();
    const description = editForm.description.trim();

    if (!title || !department) {
      setActionError("กรุณากรอกชื่อเรื่องและฝ่าย/สถาบันให้ครบถ้วน");
      return;
    }

    try {
      setSavingId(id);
      setActionError(null);
      setActionSuccess(null);
      setGlobalLoadingMessage("กำลังบันทึกการแก้ไขเอกสาร โปรดรอสักครู่...");

      // อัปเดตไฟล์แนบให้รองรับทั้งไฟล์เดิมและไฟล์ใหม่ (ลบไฟล์เดิมบางไฟล์ได้)
      const existingFilesForDoc = existingFilesMap[id] || [];
      if (selectedFiles.length > 0 || existingFilesForDoc.length >= 0) {
        const fileForm = new FormData();
        fileForm.set("id", String(id));

        // ส่งไฟล์เดิมที่ต้องการเก็บไว้ไปด้วย (เหมือนหน้า edit ของผู้ใช้)
        fileForm.set(
          "existingUrls",
          JSON.stringify(existingFilesForDoc.map((f) => f.url))
        );
        fileForm.set(
          "existingNames",
          JSON.stringify(existingFilesForDoc.map((f) => f.name))
        );

        selectedFiles.forEach((f) => fileForm.append("files", f));

        const fileRes = await fetch("/api/admin/documents/update-files", {
          method: "POST",
          body: fileForm,
        });

        if (!fileRes.ok) {
          throw new Error("Failed to update files");
        }
      }

      const res = await fetch(`/api/admin/documents?id=${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, department, access_level, description, tags }),
      });
      if (!res.ok) throw new Error("Failed to update document");

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, title, department, access_level, description }
            : doc
        )
      );
      setEditingId(null);
      setSelectedFiles([]);
      setExistingFilesMap((prev) => ({
        ...prev,
        [id]: prev[id] || existingFilesForDoc,
      }));
      setActionSuccess("บันทึกการแก้ไขเสร็จสิ้น");
      setSuccessBanner("บันทึกการแก้ไขเอกสารเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Admin update document error", err);
      setActionError("ไม่สามารถบันทึกการแก้ไขเอกสารได้");
    } finally {
      setSavingId(null);
      setGlobalLoadingMessage(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setSavingId(id);
      setActionError(null);
      setActionSuccess(null);
      setGlobalLoadingMessage("กำลังลบเอกสาร โปรดรอสักครู่...");
      const res = await fetch(`/api/admin/documents?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete document");

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setConfirmDeleteDoc(null);
      setActionSuccess("ลบเอกสารเสร็จสิ้น");
      setSuccessBanner("ลบเอกสารเรียบร้อยแล้ว");
    } catch (err) {
      console.error("Admin delete document error", err);
      setActionError("ไม่สามารถลบเอกสารได้");
    } finally {
      setSavingId(null);
      setGlobalLoadingMessage(null);
    }
  };

  const sortedDocs = [...documents].sort((a, b) =>
    (b.created_at || "").localeCompare(a.created_at || "")
  );

  const q = searchInput.toLowerCase().trim();
  const filteredDocs = sortedDocs.filter((doc) => {
    if (!q) return true;
    const haystack = [
      doc.title || "",
      doc.department || "",
      doc.tags || "",
      doc.description || "",
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filteredDocs.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedDocs = filteredDocs.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  return (
    <div className="space-y-4">
      {globalLoadingMessage && (
        <div className="fixed inset-x-0 top-4 z-40 flex justify-center px-4">
          <div className="flex max-w-md items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-[11px] text-white shadow-lg">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/20 animate-pulse">
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
                <path d="M12 3v12" />
                <path d="M8 7l4-4 4 4" />
                <rect x="4" y="15" width="16" height="4" rx="1" />
              </svg>
            </span>
            <span>{globalLoadingMessage}</span>
          </div>
        </div>
      )}

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
          จัดการเอกสารทั้งหมด
        </h1>
        <p className="text-[11px] text-slate-600">
          หน้านี้ใช้สำหรับผู้ดูแลระบบในการแก้ไข หรือลบเอกสารทั้งหมดในระบบ
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

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
          {actionError}
        </div>
      )}

      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white px-5 py-4 text-[11px] text-rose-800 shadow-xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-600 text-white">
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
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <line x1="10" y1="11" x2="10" y2="17" />
                  <line x1="14" y1="11" x2="14" y2="17" />
                </svg>
              </span>
              <span className="font-semibold text-rose-700">ยืนยันการลบเอกสาร</span>
            </div>
            <p className="text-[11px] text-rose-700">
              คุณต้องการลบเอกสาร "{confirmDeleteDoc.title}" ใช่หรือไม่?
            </p>
            <div className="mt-4 flex justify-end gap-2 text-[10px]">
              <button
                type="button"
                onClick={() => setConfirmDeleteDoc(null)}
                className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                disabled={savingId === confirmDeleteDoc.id}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteDoc.id)}
                className="rounded-full bg-rose-600 px-4 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                disabled={savingId === confirmDeleteDoc.id}
              >
                {savingId === confirmDeleteDoc.id
                  ? "กำลังกำลังลบ..."
                  : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600">
          กำลังโหลดรายการเอกสารทั้งหมด...
        </div>
      ) : error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
          {error}
        </div>
      ) : filteredDocs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600">
          ยังไม่มีข้อมูลเอกสาร
        </div>
      ) : (
        <ul className="space-y-2 text-[11px]">
          {pagedDocs.map((doc) => {
            const displayDate = formatThaiDateTime(doc.created_at);

            const rawAccess = (doc.access_level || "").toLowerCase();
            let accessText = "";
            let accessColorClass = "";
            if (rawAccess.includes("team")) {
              accessText = "แชร์ภายในหน่วยงาน";
              accessColorClass = "bg-sky-100 text-sky-800";
            } else if (rawAccess.includes("public")) {
              accessText = "แชร์ทั้งองค์กร";
              accessColorClass = "bg-emerald-100 text-emerald-800";
            } else if (rawAccess) {
              accessText = "แชร์ส่วนตัว";
              accessColorClass = "bg-amber-100 text-amber-800";
            }

            const existingFiles = existingFilesMap[doc.id] || [];

            return (
              <li
                key={doc.id}
                className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-slate-900">
                      {doc.title}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[10px] text-slate-600">
                      <span className="max-w-[200px] truncate rounded-full bg-indigo-50 px-2 py-0.5 text-indigo-700">
                        {doc.department || "ไม่ระบุฝ่าย"}
                      </span>
                      <span className="max-w-[200px] truncate rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">
                        {doc.tags || "-"}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[9px] text-slate-700">
                        เพิ่มเมื่อ {displayDate}
                      </span>
                      {accessText && accessColorClass && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[9px] font-medium ${accessColorClass}`}
                        >
                          {accessText}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-1 md:w-auto md:flex-row md:items-center md:justify-end">
                    <div className="flex w-full gap-2 md:w-auto">
                      <button
                        type="button"
                        onClick={() => window.open(`/admin/detail?id=${doc.id}`, "_blank")}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-indigo-500 px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-indigo-600 disabled:opacity-60 md:w-auto"
                        title="ดูรายละเอียดเอกสารในหน้าแอดมิน"
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white/90 flex-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-2.5 w-2.5 text-indigo-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M2 12s3-7.5 10-7.5 10 7.5 10 7.5-3 7.5-10 7.5-10-7.5-10-7.5z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </span>
                        <span className="text-center">ดูเอกสาร</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => startEdit(doc)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60 md:w-auto"
                        disabled={savingId !== null && savingId !== doc.id}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white flex-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-2.5 w-2.5 text-emerald-600"
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
                        <span className="text-center">แก้ไข</span>
                      </button>
                    </div>
                    <div className="w-full md:w-auto">
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteDoc(doc)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-rose-500 px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60 md:w-auto"
                        disabled={savingId === doc.id}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white flex-none">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-2.5 w-2.5 text-rose-600"
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
                        <span className="text-center">ลบ</span>
                      </button>
                    </div>
                  </div>
                </div>

                {editingId === doc.id && (
                  <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-[10px] text-slate-800">
                    <div className="grid gap-2 md:grid-cols-3">
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-700">
                          ชื่อเอกสาร
                        </label>
                        <input
                          className="h-7 rounded border border-slate-300 px-2 text-[10px] focus:border-indigo-500 focus:outline-none"
                          value={editForm.title}
                          onChange={(e) => handleChange("title", e.target.value)}
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-700">
                          ฝ่าย/สถาบัน
                        </label>
                        <input
                          className="h-7 rounded border border-slate-300 px-2 text-[10px] focus:border-indigo-500 focus:outline-none"
                          value={editForm.department}
                          onChange={(e) =>
                            handleChange("department", e.target.value)
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-[10px] font-semibold text-slate-700">
                          ระดับการแชร์
                        </label>
                        <select
                          className="h-7 rounded border border-slate-300 px-2 text-[10px] focus:border-indigo-500 focus:outline-none"
                          value={editForm.access_level}
                          onChange={(e) =>
                            handleChange("access_level", e.target.value)
                          }
                        >
                          <option value="private">แชร์ส่วนตัว</option>
                          <option value="team">แชร์ภายในหน่วยงาน</option>
                          <option value="public">แชร์ทั้งองค์กร</option>
                        </select>
                      </div>
                    </div>

                    <div className="mt-2 rounded-xl border border-indigo-100 bg-white/80 p-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-semibold text-slate-800">
                          คำอธิบายเอกสาร
                        </label>
                        <span className="text-[9px] text-slate-400">
                          อธิบายรายละเอียดหรือบริบทของเอกสารเพิ่มเติม
                        </span>
                      </div>
                      <textarea
                        className="min-h-[56px] w-full rounded-lg border border-slate-200 bg-indigo-50/40 px-2 py-1.5 text-[10px] text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-300"
                        value={editForm.description}
                        onChange={(e) => handleChange("description", e.target.value)}
                        placeholder="เช่น วัตถุประสงค์ของเอกสาร เนื้อหาสำคัญ หรือข้อควรระวังในการใช้งาน"
                      />
                    </div>

                    <div className="mt-2 space-y-1">
                      <label className="text-[10px] font-semibold text-slate-700">
                        เลือกไฟล์เอกสารใหม่ (ถ้ามีการเปลี่ยนไฟล์)
                      </label>
                      <input
                        type="file"
                        multiple
                        accept=".pdf,.docx,.jpg,.jpeg,.png"
                        className="block w-full cursor-pointer rounded border border-slate-300 bg-white px-2 py-1 text-[10px] text-slate-700 file:mr-2 file:rounded-full file:border-0 file:bg-indigo-600 file:px-3 file:py-1 file:text-[10px] file:font-medium file:text-white hover:file:bg-indigo-700"
                        onChange={(e) => {
                          const files = Array.from(e.target.files ?? []);
                          if (files.length === 0) return;

                          const allowedExt = ["pdf", "docx", "jpg", "jpeg", "png"];
                          const allowed: File[] = [];
                          let hasInvalid = false;

                          for (const file of files) {
                            const ext = file.name.split(".").pop()?.toLowerCase();
                            if (ext && allowedExt.includes(ext)) {
                              allowed.push(file);
                            } else {
                              hasInvalid = true;
                            }
                          }

                          if (hasInvalid) {
                            setActionError(
                              "บางไฟล์ไม่รองรับ สามารถเลือกได้เฉพาะไฟล์ PDF, DOCX, JPG, PNG เท่านั้น"
                            );
                          }

                          if (allowed.length === 0) {
                            e.target.value = "";
                            return;
                          }

                          // ตั้งค่าไฟล์ใหม่ (แทนชุดเดิม) สำหรับการอัปเดตไฟล์แนบ
                          setSelectedFiles(allowed);
                          e.target.value = "";
                        }}
                      />

                      {selectedFiles.length > 0 && (
                        <div className="mt-1 space-y-1 text-[9px] text-slate-600">
                          <div className="flex items-center justify-between">
                            <p>
                              เลือกไฟล์ใหม่แล้ว {selectedFiles.length} ไฟล์ ระบบจะอัปเดตไฟล์แนบเดิมเมื่อกด
                              {" "}
                              <span className="font-semibold">"บันทึกการแก้ไข"</span>
                            </p>
                            <button
                              type="button"
                              className="ml-2 rounded-full border border-slate-300 bg-white px-2 py-0.5 text-[9px] font-medium text-slate-600 hover:bg-slate-100"
                              onClick={() => setSelectedFiles([])}
                            >
                              ลบไฟล์ใหม่ทั้งหมด
                            </button>
                          </div>

                          <div className="max-h-24 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-2 py-1">
                            {selectedFiles.map((file, index) => {
                              const sizeKb = Math.max(1, Math.round(file.size / 1024));
                              const ext = file.name.split(".").pop()?.toLowerCase() || "";
                              const isImage = ["jpg", "jpeg", "png"].includes(ext);

                              return (
                                <div
                                  key={index}
                                  className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 shadow-sm"
                                >
                                  <div className="flex min-w-0 flex-1 items-center gap-2">
                                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-slate-100 text-[9px] text-slate-700">
                                      {isImage ? (
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
                                          <rect x="3" y="3" width="18" height="18" rx="2" />
                                          <circle cx="8.5" cy="8.5" r="1.5" />
                                          <path d="M21 15l-5-5L5 21" />
                                        </svg>
                                      ) : ext === "pdf" ? (
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
                                      ) : (
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
                                          <path d="M4 4h16v16H4z" />
                                          <path d="M4 9h16" />
                                        </svg>
                                      )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <div className="truncate text-[9px] font-medium text-slate-800">
                                        {file.name}
                                      </div>
                                      <div className="text-[9px] text-slate-500">
                                        {ext ? ext.toUpperCase() : ""}
                                        {ext && " · "}
                                        {sizeKb.toLocaleString()} KB
                                      </div>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    className="ml-2 flex h-4 w-4 items-center justify-center rounded-full bg-slate-200 text-[9px] text-slate-700 hover:bg-slate-300"
                                    onClick={() => {
                                      setSelectedFiles((prev) =>
                                        prev.filter((_, i) => i !== index)
                                      );
                                    }}
                                  >
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
                                      <path d="M18 6 6 18" />
                                      <path d="M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {existingFiles.length > 0 && (
                        <div className="mt-2 space-y-1 text-[9px] text-slate-700">
                          <label className="text-[10px] font-semibold text-slate-800">
                            ไฟล์เอกสารเดิมที่แนบอยู่ ({existingFiles.length} ไฟล์)
                          </label>
                          <div className="max-h-28 space-y-1 overflow-y-auto rounded-lg border border-slate-200 bg-slate-50 px-2 py-2">
                            {existingFiles.map((file, index) => (
                              <div
                                key={file.url + index}
                                className="flex items-center justify-between gap-2 rounded-md bg-white px-2 py-1 shadow-sm"
                              >
                                <div className="flex min-w-0 flex-1 items-center gap-2">
                                  <span className="flex h-5 w-5 items-center justify-center rounded-md bg-indigo-50 text-[9px] text-indigo-700">
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
                                  </span>
                                  <span className="truncate text-[10px] font-medium text-slate-800">
                                    {file.name}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="whitespace-nowrap rounded-full bg-slate-800 px-3 py-0.5 text-[9px] font-medium text-white hover:bg-black"
                                  >
                                    เปิดดู
                                  </a>
                                  <button
                                    type="button"
                                    className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[9px] text-rose-700 hover:bg-rose-200"
                                    onClick={() => {
                                      setExistingFilesMap((prev) => ({
                                        ...prev,
                                        [doc.id]: (prev[doc.id] || []).filter((_, i) => i !== index),
                                      }));
                                    }}
                                    title="ลบไฟล์เดิมนี้ออกจากเอกสาร"
                                  >
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
                                      <path d="M18 6 6 18" />
                                      <path d="M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                        disabled={savingId === doc.id}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-600">
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
                            <path d="M18 6 6 18" />
                            <path d="M6 6l12 12" />
                          </svg>
                        </span>
                        <span>ยกเลิก</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSave(doc.id, doc.tags)}
                        className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-4 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                        disabled={savingId === doc.id}
                      >
                        <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            className="h-2.5 w-2.5 text-emerald-600"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                            <polyline points="7 9 12 14 17 9" />
                            <line x1="12" y1="14" x2="12" y2="3" />
                          </svg>
                        </span>
                        <span>
                          {savingId === doc.id
                            ? "กำลังบันทึกเอกสาร โปรดรอสักครู่..."
                            : "บันทึกการแก้ไข"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}