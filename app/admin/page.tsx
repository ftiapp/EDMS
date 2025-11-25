"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Doughnut } from "react-chartjs-2";

ChartJS.register(ArcElement, Tooltip, Legend);

interface DbDocument {
  id: number;
  title: string;
  department: string;
  tags: string | null;
  description: string | null;
  access_level: string | null;
  file_url: string;
  created_at: string;
  edited_at?: string | null;
  original_filenames?: string | null;
}

interface SummaryByDept {
  department: string;
  count: number;
}

interface SummaryByExt {
  ext: string;
  count: number;
}

interface AccessSummaryItem {
  key: "private" | "team" | "public";
  label: string;
  count: number;
}

interface MonthlyFilePoint {
  monthLabel: string;
  pdf: number;
  docx: number;
  png: number;
  jpg: number;
}

export default function AdminDashboardPage() {
  const [documents, setDocuments] = useState<DbDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trashCount, setTrashCount] = useState(0);

  const [editingDocId, setEditingDocId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    department: "",
    access_level: "private",
  });
  const [savingDocId, setSavingDocId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<DbDocument | null>(
    null
  );

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
    async function fetchDocs() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/documents");
        if (!res.ok) throw new Error("Failed to fetch documents");
        const data = await res.json();
        const dbDocs = (data.documents || []) as DbDocument[];
        setDocuments(dbDocs);

        // นับจำนวนเอกสารในถังขยะ (is_deleted = 1)
        try {
          const trashRes = await fetch("/api/documents/trash");
          if (trashRes.ok) {
            const trashData = await trashRes.json();
            const trashDocs = (trashData.documents || []) as DbDocument[];
            setTrashCount(trashDocs.length);
          }
        } catch (e) {
          console.error("Admin dashboard fetch trash error", e);
        }
      } catch (err) {
        console.error("Admin dashboard fetch error", err);
        setError("ไม่สามารถดึงข้อมูลเอกสารได้");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDocs();
  }, []);

  const now = useMemo(() => new Date(), []);

  const startEdit = (doc: DbDocument) => {
    setEditingDocId(doc.id);
    setEditForm({
      title: doc.title || "",
      department: doc.department || "",
      access_level: (doc.access_level || "private").toString(),
    });
    setActionError(null);
  };

  const cancelEdit = () => {
    setEditingDocId(null);
    setActionError(null);
  };

  const handleEditChange = (
    field: "title" | "department" | "access_level",
    value: string
  ) => {
    setEditForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveEdit = async (id: number) => {
    const title = editForm.title.trim();
    const department = editForm.department.trim();
    const access_level = editForm.access_level.trim();

    if (!title || !department) {
      setActionError("กรุณากรอกชื่อเรื่องและฝ่าย/สถาบันให้ครบถ้วน");
      return;
    }

    try {
      setSavingDocId(id);
      setActionError(null);
      const res = await fetch(`/api/documents?id=${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          department,
          access_level,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to update document");
      }

      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? {
                ...doc,
                title,
                department,
                access_level,
              }
            : doc
        )
      );

      setEditingDocId(null);
    } catch (err) {
      console.error("Admin update document error", err);
      setActionError("ไม่สามารถบันทึกการแก้ไขเอกสารได้");
    } finally {
      setSavingDocId(null);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      setSavingDocId(id);
      setActionError(null);

      const res = await fetch(`/api/documents?id=${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to delete document");
      }

      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setConfirmDeleteDoc(null);
    } catch (err) {
      console.error("Admin delete document error", err);
      setActionError("ไม่สามารถลบเอกสารได้");
    } finally {
      setSavingDocId(null);
    }
  };

  const {
    totalDocs,
    totalDepartments,
    recentCreated,
    recentEdited,
    deptSummary,
    extSummary,
    accessSummary,
    latestDocs,
    maxDeptCount,
    maxAccessCount,
    maxExtCount,
    monthlyFileSeries,
    maxMonthlyValue,
  } = useMemo(() => {
    const totalDocs = documents.length;

    const deptMap = new Map<string, number>();
    const extMap = new Map<string, number>();

    let recentCreated = 0;
    let recentEdited = 0;

    const accessCount: Record<"private" | "team" | "public", number> = {
      private: 0,
      team: 0,
      public: 0,
    };

    const createdWithinDays = (created_at: string, days: number) => {
      const d = new Date(created_at);
      if (Number.isNaN(d.getTime())) return false;
      const diff = now.getTime() - d.getTime();
      return diff <= days * 24 * 60 * 60 * 1000;
    };

    const editedWithinDays = (edited_at: string | null | undefined, days: number) => {
      if (!edited_at) return false;
      const d = new Date(edited_at);
      if (Number.isNaN(d.getTime())) return false;
      const diff = now.getTime() - d.getTime();
      return diff <= days * 24 * 60 * 60 * 1000;
    };

    const latestDocs = [...documents]
      .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""))
      .slice(0, 5);

    // เตรียมโครงสำหรับกราฟเส้นรายเดือน (ย้อนหลัง 6 เดือน)
    const monthBuckets: MonthlyFilePoint[] = [];
    const monthIndexMap = new Map<string, number>();

    {
      const base = new Date(now.getFullYear(), now.getMonth(), 1);
      for (let i = 5; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = `${d.getMonth() + 1}/${String(d.getFullYear()).slice(-2)}`;
        monthIndexMap.set(key, monthBuckets.length);
        monthBuckets.push({
          monthLabel: label,
          pdf: 0,
          docx: 0,
          png: 0,
          jpg: 0,
        });
      }
    }

    for (const doc of documents) {
      const dept = doc.department || "ไม่ระบุฝ่าย";
      deptMap.set(dept, (deptMap.get(dept) || 0) + 1);

      if (createdWithinDays(doc.created_at, 7)) recentCreated++;
      if (editedWithinDays(doc.edited_at, 7)) recentEdited++;

      const rawAccess = (doc.access_level || "").toString().toLowerCase().trim();
      let normalized: "private" | "team" | "public" = "private";
      if (rawAccess.includes("team") || rawAccess.includes("ทีม")) {
        normalized = "team";
      } else if (rawAccess.includes("public") || rawAccess.includes("สาธารณะ")) {
        normalized = "public";
      }
      accessCount[normalized]++;

      // เก็บข้อมูลสำหรับกราฟเส้นรายเดือนตามชนิดไฟล์หลัก
      if (doc.created_at) {
        const createdDate = new Date(doc.created_at);
        if (!Number.isNaN(createdDate.getTime())) {
          const key = `${createdDate.getFullYear()}-${String(
            createdDate.getMonth() + 1
          ).padStart(2, "0")}`;
          const idx = monthIndexMap.get(key);
          if (idx !== undefined) {
            const point = monthBuckets[idx];
            // ใช้ชื่อไฟล์แนบเดิมเพื่อเดา ext หลักตัวแรก
            let mainExt: string | null = null;
            if (doc.original_filenames) {
              try {
                const names = JSON.parse(doc.original_filenames);
                if (Array.isArray(names) && names.length > 0) {
                  const firstName = names.find((n: unknown) => typeof n === "string");
                  if (typeof firstName === "string") {
                    const parts = firstName.split(".");
                    if (parts.length > 1) {
                      mainExt = parts[parts.length - 1].toLowerCase();
                    }
                  }
                }
              } catch {
                // ignore
              }
            }

            if (mainExt) {
              if (mainExt === "pdf") {
                point.pdf++;
              } else if (mainExt === "docx") {
                point.docx++;
              } else if (mainExt === "png") {
                point.png++;
              } else if (mainExt === "jpg" || mainExt === "jpeg") {
                point.jpg++;
              }
            }
          }
        }
      }

      if (doc.original_filenames) {
        try {
          const names = JSON.parse(doc.original_filenames);
          if (Array.isArray(names)) {
            for (const name of names) {
              if (typeof name !== "string") continue;
              const parts = name.split(".");
              const ext = parts.length > 1 ? parts[parts.length - 1].toLowerCase() : "อื่น ๆ";
              const key = ext || "อื่น ๆ";
              extMap.set(key, (extMap.get(key) || 0) + 1);
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const deptSummary: SummaryByDept[] = Array.from(deptMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const extSummary: SummaryByExt[] = Array.from(extMap.entries())
      .map(([ext, count]) => ({ ext, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const accessSummary: AccessSummaryItem[] = [
      { key: "private", label: "แชร์ส่วนตัว", count: accessCount.private },
      { key: "team", label: "แชร์ภายในหน่วยงาน", count: accessCount.team },
      { key: "public", label: "แชร์ทั้งองค์กร", count: accessCount.public },
    ];

    const totalDepartments = deptMap.size;

    const maxDeptCount = deptSummary.reduce(
      (max, item) => (item.count > max ? item.count : max),
      0
    );
    const maxExtCount = extSummary.reduce(
      (max, item) => (item.count > max ? item.count : max),
      0
    );
    const maxAccessCount = accessSummary.reduce(
      (max, item) => (item.count > max ? item.count : max),
      0
    );

    const maxMonthlyValue = monthBuckets.reduce((max, m) => {
      const localMax = Math.max(m.pdf, m.docx, m.png, m.jpg);
      return localMax > max ? localMax : max;
    }, 0);

    return {
      totalDocs,
      totalDepartments,
      recentCreated,
      recentEdited,
      deptSummary,
      extSummary,
      accessSummary,
      latestDocs,
      maxDeptCount,
      maxAccessCount,
      maxExtCount,
      monthlyFileSeries: monthBuckets,
      maxMonthlyValue,
    };
  }, [documents, now]);

  const accessDonutData = useMemo(() => {
    if (!accessSummary.length) return null;

    const labels = accessSummary.map((item) => item.label);
    const data = accessSummary.map((item) => item.count);

    const backgroundColor = [
      "#fb923c", // orange
      "#0ea5e9", // sky
      "#22c55e", // emerald
    ];

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor: backgroundColor,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [accessSummary]);

  const extDonutData = useMemo(() => {
    if (!extSummary.length) {
      return null;
    }

    const labels = extSummary.map((item) => (item.ext || "อื่น ๆ").toUpperCase());
    const data = extSummary.map((item) => item.count);

    const baseColors = [
      "#4f46e5", // indigo
      "#0ea5e9", // sky
      "#22c55e", // emerald
      "#eab308", // amber
      "#f97316", // orange
      "#ec4899", // pink
    ];

    const backgroundColor = data.map(
      (_, idx) => baseColors[idx % baseColors.length]
    );
    const borderColor = backgroundColor.map((c) => c);

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderColor,
          borderWidth: 2,
          hoverOffset: 6,
        },
      ],
    };
  }, [extSummary]);

  const extDonutOptions = useMemo(
    () => ({
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          titleFont: {
            family: "Prompt, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
          },
          bodyFont: {
            family: "Prompt, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif",
          },
          callbacks: {
            label: (ctx: any) => {
              const label = ctx.label || "";
              const value = ctx.parsed || 0;
              return `${label}: ${value.toLocaleString()} ไฟล์`;
            },
          },
        },
      },
      cutout: "60%",
      responsive: true,
      maintainAspectRatio: false,
    }),
    []
  );

  return (
    <div className="space-y-5">
      <section className="space-y-1">
        <h1 className="text-lg font-semibold text-slate-900">
          แดชบอร์ดผู้ดูแลระบบ EDMS
        </h1>
        <p className="text-[11px] text-amber-700">
          หน้านี้สำหรับผู้ดูแลระบบเท่านั้น ไม่เกี่ยวข้องกับการใช้งานของผู้ใช้ทั่วไป
        </p>
      </section>

      {actionError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-[11px] text-rose-700">
          {actionError}
        </div>
      )}

      {confirmDeleteDoc && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white px-5 py-4 text-[11px] text-rose-800 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
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
                disabled={savingDocId === confirmDeleteDoc.id}
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => handleDelete(confirmDeleteDoc.id)}
                className="rounded-full bg-rose-600 px-4 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-rose-700 disabled:opacity-60"
                disabled={savingDocId === confirmDeleteDoc.id}
              >
                {savingDocId === confirmDeleteDoc.id
                  ? "กำลังลบ..."
                  : "ยืนยันการลบ"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] text-slate-600">
          กำลังโหลดข้อมูลเอกสาร...
        </div>
      )}

      {!isLoading && !error && (
        <>
          {/* Summary cards */}
          <section className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="text-[11px] text-slate-500">เอกสารทั้งหมด</div>
              <div className="mt-1 text-2xl font-semibold text-indigo-700">
                {totalDocs.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="text-[11px] text-slate-500">จำนวนฝ่าย/สถาบันในระบบ</div>
              <div className="mt-1 text-2xl font-semibold text-amber-700">
                {totalDepartments.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="text-[11px] text-slate-500">เอกสารใหม่ใน 7 วันที่ผ่านมา</div>
              <div className="mt-1 text-2xl font-semibold text-emerald-700">
                {recentCreated.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="text-[11px] text-slate-500">เอกสารถูกแก้ไขใน 7 วันที่ผ่านมา</div>
              <div className="mt-1 text-2xl font-semibold text-violet-700">
                {recentEdited.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="text-[11px] text-slate-500">เอกสารในถังขยะ</div>
              <div className="mt-1 text-2xl font-semibold text-rose-700">
                {trashCount.toLocaleString()}
              </div>
            </div>
          </section>

          {/* Dept + Access */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-800">สถิติการจัดทำเอกสารในแต่ละฝ่าย/สถาบัน อันดับสูงสุด 6 รายการ</span>
              </div>
              {deptSummary.length === 0 ? (
                <p className="text-[11px] text-slate-500">ยังไม่มีข้อมูลเอกสาร</p>
              ) : (
                <ul className="space-y-2">
                  {deptSummary.map((item, index) => {
                    const ratio = maxDeptCount > 0 ? item.count / maxDeptCount : 0;
                    const widthPercent = `${Math.max(10, ratio * 100)}%`;
                    const barPalette = [
                      "bg-indigo-500",
                      "bg-sky-500",
                      "bg-emerald-500",
                      "bg-amber-500",
                      "bg-rose-500",
                      "bg-violet-500",
                    ];
                    const textPalette = [
                      "text-indigo-700",
                      "text-sky-700",
                      "text-emerald-700",
                      "text-amber-700",
                      "text-rose-700",
                      "text-violet-700",
                    ];
                    const containerPalette = [
                      "bg-indigo-50",
                      "bg-sky-50",
                      "bg-emerald-50",
                      "bg-amber-50",
                      "bg-rose-50",
                      "bg-violet-50",
                    ];
                    const barColor = barPalette[index % barPalette.length];
                    const textColor = textPalette[index % textPalette.length];
                    const containerColor = containerPalette[index % containerPalette.length];

                    return (
                      <li
                        key={item.department}
                        className={`space-y-1 rounded-md px-3 py-2 text-slate-900 ${containerColor}`}
                      >
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="truncate pr-2">
                            {item.department || "ไม่ระบุฝ่าย"}
                          </span>
                          <span
                            className={`whitespace-nowrap font-semibold ${textColor}`}
                          >
                            {item.count.toLocaleString()} ไฟล์
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 w-full rounded-full bg-white/60">
                          <div
                            className={`h-1.5 rounded-full ${barColor}`}
                            style={{ width: widthPercent }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-800">จำนวนเอกสารตามระดับการแชร์</span>
              </div>

              {!accessDonutData ? (
                <p className="text-[11px] text-slate-500">ยังไม่มีข้อมูลเอกสาร</p>
              ) : (
                <div className="flex min-h-[200px] flex-col items-center justify-center gap-4 md:min-h-[220px]">
                  <div className="flex h-40 w-40 items-center justify-center md:h-44 md:w-44">
                    <Doughnut data={accessDonutData} options={extDonutOptions} />
                  </div>

                  <ul className="w-full max-w-xs space-y-1">
                    {accessSummary.map((item) => {
                      const colorClass =
                        item.key === "private"
                          ? "bg-orange-500"
                          : item.key === "team"
                          ? "bg-sky-500"
                          : "bg-emerald-500";

                      return (
                        <li
                          key={item.key}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${colorClass}`} />
                            <span className="text-[11px] text-slate-800">
                              {item.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-900">
                            {item.count.toLocaleString()} ไฟล์
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </section>

          {/* File type + latest docs */}
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-800">จำนวนไฟล์ตามชนิดนามสกุล</span>
              </div>
              {extSummary.length === 0 || !extDonutData ? (
                <p className="text-[11px] text-slate-500">ยังไม่มีข้อมูลไฟล์แนบ</p>
              ) : (
                <div className="flex min-h-[220px] flex-col items-center justify-center gap-4 md:min-h-[260px]">
                  {/* Donut chart ตรงกลางด้านบน */}
                  <div className="flex h-44 w-44 items-center justify-center md:h-52 md:w-52">
                    <Doughnut data={extDonutData} options={extDonutOptions} />
                  </div>

                  {/* Legend list ด้านล่างเต็มความกว้างการ์ด */}
                  <ul className="w-full max-w-sm space-y-1">
                    {extSummary.map((item, index) => {
                      const label = (item.ext || "อื่น ๆ").toUpperCase();
                      const colors = [
                        "bg-indigo-500",
                        "bg-sky-500",
                        "bg-emerald-500",
                        "bg-amber-500",
                        "bg-orange-500",
                        "bg-pink-500",
                      ];
                      const dotColor = colors[index % colors.length];

                      return (
                        <li
                          key={item.ext}
                          className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-1.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className={`h-2.5 w-2.5 rounded-full ${dotColor}`} />
                            <span className="uppercase text-[11px] text-slate-800">
                              {label}
                            </span>
                          </div>
                          <span className="text-[11px] font-semibold text-slate-900">
                            {item.count.toLocaleString()} ไฟล์
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] shadow-sm">
              <div className="mb-2 flex items-center justify-between">
                <span className="font-semibold text-slate-800">เอกสารล่าสุด (5 รายการ)</span>
              </div>

              {latestDocs.length === 0 ? (
                <p className="text-[11px] text-slate-500">ยังไม่มีข้อมูลเอกสาร</p>
              ) : (
                <ul className="space-y-2">
                  {latestDocs.map((doc) => {
                    const displayDate = formatThaiDateTime(doc.created_at);

                    return (
                      <li
                        key={doc.id}
                        className="space-y-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-sm transition hover:border-indigo-200 hover:bg-indigo-50/60"
                      >
                        <div className="flex min-w-0 items-center justify-between gap-3">
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            {/* ไอคอนเอกสารแบบการ์ด Search */}
                            <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-indigo-600 text-white shadow">

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

                            <div className="min-w-0">
                              <div className="truncate font-semibold text-slate-900">
                                {doc.title}
                              </div>
                              <div className="mt-0.5 flex items-center gap-2 text-[10px] text-slate-600">
                                <span className="truncate">
                                  {doc.department || "ไม่ระบุฝ่าย"}
                                </span>
                                <span className="hidden truncate text-slate-500 sm:inline">
                                  {doc.tags || "-"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            <span className="whitespace-nowrap rounded-full bg-indigo-100 px-3 py-1 text-[10px] font-medium text-indigo-700">
                              {displayDate}
                            </span>

                            <div className="flex gap-1">
                              <button
                                type="button"
                                onClick={() => startEdit(doc)}
                                className="inline-flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
                                disabled={savingDocId !== null && savingDocId !== doc.id}
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
                                    <path d="M12 20h9" />
                                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                  </svg>
                                </span>
                                <span>แก้ไข</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteDoc(doc)}
                                className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-rose-600 disabled:opacity-60"
                                disabled={savingDocId !== null}
                              >
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
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
                                <span>ลบ</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        {editingDocId === doc.id && (
                          <div className="mt-2 rounded-xl bg-indigo-50 px-3 py-2 text-[10px] text-slate-800">
                            <div className="grid gap-2 md:grid-cols-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-semibold text-slate-700">
                                  ชื่อเอกสาร
                                </label>
                                <input
                                  className="h-7 rounded border border-slate-300 px-2 text-[10px] focus:border-indigo-500 focus:outline-none"
                                  value={editForm.title}
                                  onChange={(e) =>
                                    handleEditChange("title", e.target.value)
                                  }
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
                                    handleEditChange("department", e.target.value)
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
                                    handleEditChange("access_level", e.target.value)
                                  }
                                >
                                  <option value="private">แชร์ส่วนตัว</option>
                                  <option value="team">แชร์ภายในหน่วยงาน</option>
                                  <option value="public">แชร์ทั้งองค์กร</option>
                                </select>
                              </div>
                            </div>

                            <div className="mt-3 flex justify-end gap-2">
                              <button
                                type="button"
                                onClick={cancelEdit}
                                className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-medium text-slate-700 hover:bg-white"
                                disabled={savingDocId === doc.id}
                              >
                                ยกเลิก
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSaveEdit(doc.id)}
                                className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-3 py-1 text-[10px] font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-60"
                                disabled={savingDocId === doc.id}
                              >
                                <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white">
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
                                    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                                    <polyline points="7 9 12 14 17 9" />
                                    <line x1="12" y1="14" x2="12" y2="3" />
                                  </svg>
                                </span>
                                <span>
                                  {savingDocId === doc.id
                                    ? "กำลังบันทึก..."
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
          </section>
        </>
      )}
    </div>
  );
}