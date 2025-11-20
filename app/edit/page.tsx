"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

export default function EditDocumentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [currentDateTimeThai, setCurrentDateTimeThai] = useState("");
  const [initialTitle] = useState(() => searchParams.get("title") ?? "");
  const [initialDepartment] = useState(() => searchParams.get("department") ?? "");
  const [initialTags] = useState(() => searchParams.get("tags") ?? "");
  const [initialDescription] = useState(
    () => searchParams.get("description") ?? ""
  );
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [showConfirmCancel, setShowConfirmCancel] = useState(false);

  useEffect(() => {
    const now = new Date();
    const iso = now.toISOString();
    const local = iso.slice(0, 10); // yyyy-MM-dd
    setCurrentDateTime(local);
    const base = now.toLocaleString("th-TH", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Bangkok",
    });
    setCurrentDateTimeThai(`${base} น.`);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      setMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  function isAllowedFile(file: File) {
    const allowed = ["pdf", "docx", "jpg", "jpeg", "png"];
    const ext = file.name.split(".").pop()?.toLowerCase();
    return !!ext && allowed.includes(ext);
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    if (!formData.get("title")) {
      setIsSuccess(false);
      setMessage("กรุณากรอกชื่อเอกสารก่อนบันทึกการแก้ไข");
      return;
    }

    const editedAt = formData.get("editedAt");
    if (!editedAt) {
      const now = new Date();
      const iso = now.toISOString();
      const local = iso.slice(0, 10);
      formData.set("editedAt", local);
    }

    const documentId = searchParams.get("id") ?? "";
    if (!documentId) {
      setIsSuccess(false);
      setMessage("ไม่พบรหัสเอกสารสำหรับการแก้ไข");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // ถ้ามีการเลือกไฟล์ใหม่ ให้อัปเดตไฟล์แนบก่อน (รองรับหลายไฟล์เหมือนหน้าอัปโหลด)
      if (selectedFiles.length > 0) {
        const fileForm = new FormData();
        fileForm.set("id", documentId);
        selectedFiles.forEach((f) => fileForm.append("files", f));

        const fileRes = await fetch("/api/documents/update-files", {
          method: "POST",
          body: fileForm,
        });

        if (!fileRes.ok) {
          throw new Error("Update files failed");
        }
      }

      const title = formData.get("title") as string;
      const department = formData.get("department") as string;
      const tags = (formData.get("tags") as string) ?? "";
      const description = (formData.get("description") as string) ?? "";
      const shareTo = (formData.get("shareTo") as string) ?? "";

      const res = await fetch(`/api/documents?id=${encodeURIComponent(documentId)}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          department,
          tags,
          description,
          access_level: shareTo,
        }),
      });

      if (!res.ok) {
        throw new Error("Update failed");
      }

      setIsSuccess(true);
      setMessage("บันทึกการแก้ไขเอกสารเรียบร้อยแล้ว!");
      setTimeout(() => {
        const idParam = searchParams.get("id");
        if (idParam) {
          router.push(`/detail?id=${encodeURIComponent(idParam)}`);
        } else {
          router.push("/search");
        }
      }, 1200);
    } catch (err) {
      console.error("Edit error", err);
      setIsSuccess(false);
      setMessage("ไม่สามารถบันทึกการแก้ไขได้ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsSaving(false);
    }
  }

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
            <Link
              href="/search"
              className="rounded-full border border-white/60 bg-white/10 px-4 py-1.5 text-white transition hover:bg-white hover:text-indigo-800"
            >
              Search
            </Link>
            <span className="rounded-full bg-white px-4 py-1.5 text-indigo-800 shadow-sm">
              Edit
            </span>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        <section className="rounded-2xl border border-indigo-100 bg-white px-8 py-6 text-xs shadow md:px-10 md:py-8">
          <h1 className="mb-2 flex items-center gap-2 text-lg font-semibold text-rose-700">
            <span className="text-base">✏️</span>
            <span>แก้ไขเอกสาร</span>
          </h1>
          <p className="mb-4 text-[11px] text-slate-600">
            กำลังแก้ไขเอกสาร: <span className="font-semibold text-slate-800">{initialTitle || "(ยังไม่มีชื่อเอกสาร)"}</span>
          </p>

          <form id="edit-form" onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Replace file (optional) */}
            <div className="space-y-2">
              <label className="mb-1 block text-[11px] font-medium text-slate-800">
                เลือกไฟล์เอกสารใหม่ (ถ้ามีการเปลี่ยนไฟล์)
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-400 bg-white px-4 py-8 text-center text-slate-500">
                <span className="mb-2 text-3xl">📤</span>
                <span className="mb-1 text-xs font-medium text-slate-800">
                  คลิกเพื่อเลือกไฟล์ใหม่
                </span>
                <span className="text-[11px] text-slate-500">
                  ถ้าไม่เลือกไฟล์ใหม่ ระบบจะใช้ไฟล์เดิมต่อไป
                </span>
                <span className="mt-1 text-[11px] text-slate-400">
                  รองรับไฟล์ : PDF, DOCX, JPG, PNG
                </span>
                <input
                  type="file"
                  name="files"
                  multiple
                  accept=".pdf,.docx,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    if (files.length === 0) return;

                    const allowedFiles: File[] = [];
                    let hasInvalid = false;

                    for (const file of files) {
                      if (isAllowedFile(file)) {
                        allowedFiles.push(file);
                      } else {
                        hasInvalid = true;
                      }
                    }

                    if (hasInvalid) {
                      setIsSuccess(false);
                      setMessage(
                        "บางไฟล์ไม่รองรับ สามารถเลือกได้เฉพาะไฟล์ PDF, DOCX, JPG, PNG เท่านั้น"
                      );
                    }

                    if (allowedFiles.length === 0) {
                      e.target.value = "";
                      return;
                    }

                    // เพิ่มไฟล์ใหม่ต่อจากรายการเดิมเหมือนหน้าอัปโหลด
                    setSelectedFiles((prev) => [...prev, ...allowedFiles]);
                    // เคลียร์ input เพื่อให้เลือกไฟล์ชุดเดิมซ้ำได้
                    e.target.value = "";
                  }}
                />
              </label>
              {selectedFiles.length > 0 && (
                <div className="mt-2 w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-700">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] font-semibold text-slate-800">
                        ไฟล์ใหม่ที่เลือกทั้งหมด ({selectedFiles.length} ไฟล์)
                      </div>
                      <p className="text-[10px] text-slate-500">
                        คุณสามารถลบไฟล์ที่ไม่ต้องการออกทีละไฟล์ก่อนบันทึกได้
                      </p>
                    </div>
                    <button
                      type="button"
                      className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[10px] font-medium text-slate-600 hover:bg-slate-100"
                      onClick={() => setSelectedFiles([])}
                    >
                      ลบทั้งหมด
                    </button>
                  </div>
                  <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {selectedFiles.map((file, index) => {
                      const sizeKb = Math.max(1, Math.round(file.size / 1024));
                      const ext = file.name.split(".").pop()?.toLowerCase() || "";
                      const isImage = ["jpg", "jpeg", "png"].includes(ext);

                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 shadow-sm"
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[11px]">
                              {isImage ? "🖼️" : ext === "pdf" ? "📄" : "📁"}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="truncate text-[11px] font-medium text-slate-800">
                                {file.name}
                              </div>
                              <div className="text-[10px] text-slate-500">
                                {ext ? ext.toUpperCase() : ""}
                                {ext && " · "}
                                {sizeKb.toLocaleString()} KB
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[11px] text-slate-700 hover:bg-slate-300"
                            onClick={() => {
                              setSelectedFiles((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
                            }}
                          >
                            ✖
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Document name & department */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-800">
                  ชื่อเอกสาร *
                </label>
                <input
                  name="title"
                  type="text"
                  defaultValue={initialTitle}
                  placeholder="กรอกชื่อเอกสาร"
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-800">
                  ฝ่าย/สถาบัน *
                </label>
                <input
                  name="department"
                  list="department-list"
                  defaultValue={initialDepartment || ""}
                  placeholder="พิมพ์เพื่อค้นหา / เลือกฝ่ายหรือสถาบัน"
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                  required
                />
                <datalist id="department-list">
                  <option value="ฝ่ายงานกรรมการและบริหารสำนักงาน (งส.)" />
                  <option value="ฝ่ายสื่อสารองค์กร (สอ.)" />
                  <option value="ฝ่ายบัญชีและการเงิน (บง.)" />
                  <option value="ฝ่ายทรัพยากรมนุษย์ (ทม.)" />
                  <option value="ฝ่ายดิจิทัลเทคโนโลยี (ดท.)" />
                  <option value="งานสำนักงานประธานและเลขาธิการ (สปธ.)" />
                  <option value="สถาบันรหัสสากล (สร.)" />
                  <option value="ฝ่ายตรวจสอบ (ตส.)" />
                  <option value="ฝ่ายส่งเสริมและสนับสนุนอุตสาหกรรม (สส.)" />
                  <option value="ฝ่ายส่งเสริมและสนับสนุนสภาอุตสาหกรรมจังหวัด (สจ.)" />
                  <option value="ฝ่ายทะเบียนสมาชิก (ทบ.)" />
                  <option value="ฝ่ายสมาชิกสัมพันธ์ กิจกรรมและรายได้ (สช.)" />
                  <option value="สถาบันวิสาหกิจขนาดกลางและขนาดย่อมอุตสาหกรรมการผลิต (สวอ.)" />
                  <option value="ฝ่ายเศรษฐกิจและวิชาการ (ศว.)" />
                  <option value="ฝ่ายต่างประเทศ (ตป.)" />
                  <option value="ฝ่ายการค้าและการลงทุน" />
                  <option value="สถาบันการเปลี่ยนแปลงสภาพภูมิอากาศ (สปอ.)" />
                  <option value="สถาบันน้ำและสิ่งแวดล้อมเพื่อความยั่งยืน (สนส.)" />
                  <option value="สถาบันพลังงานเพื่ออุตสาหกรรม (สพ.)" />
                  <option value="สถาบันอุตสาหกรรมเกษตร (สอก.)" />
                  <option value="สถาบันการจัดการบรรจุภัณฑ์และรีไซเคิลเพื่อสิ่งแวดล้อม (สบ.)" />
                  <option value="สถาบันนวัตกรรมเพื่ออุตสาหกรรม (สนอ.)" />
                  <option value="สถาบันดิจิทัลเพื่ออุตสาหกรรม (สดพ.)" />
                  <option value="สถาบันพัฒนาอุตสาหกรรมสร้างสรรค์และซอฟต์พาวเวอร์ (สพส.)" />
                  <option value="สถาบันเสริมสร้างขีดความสามารถมนุษย์" />
                  <option value="ฝ่ายกฎหมาย (กม.)" />
                  <option value="ฝ่ายธรรมาภิบาลและงานระบบคุณภาพ (ธร.)" />
                </datalist>
              </div>
            </div>

            {/* Tags and edited date */}
            <div className="grid gap-3 md:grid-cols-2">
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-800">
                  แท็ก *
                </label>
                <input
                  name="tags"
                  type="text"
                  defaultValue={initialTags}
                  placeholder="เช่น : สำคัญ , ด่วน"
                  className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                  required
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-800">
                  วันที่แก้ไขล่าสุด *
                </label>
                <input
                  name="editedAt"
                  type="text"
                  value={currentDateTimeThai}
                  readOnly
                  className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-xs outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                />
                <p className="text-[10px] text-slate-400">
                  ระบบจะตั้งเป็นวันเวลาแบบไทยของปัจจุบันให้อัตโนมัติเมื่อแก้ไข
                </p>
              </div>
            </div>

            {/* Share */}
            <div className="mt-3 space-y-1">
              <label className="flex items-center gap-1 text-[11px] font-medium text-slate-800">
                <span className="text-[11px]">👥</span>
                <span>แชร์เอกสาร (สิทธิ์การเข้าถึง) *</span>
              </label>
              <select
                name="shareTo"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                defaultValue=""
                required
              >
                <option value="" disabled>
                  เลือกระดับการแชร์
                </option>
                <option value="private">🔒 ส่วนตัว</option>
                <option value="team">👥 แชร์กันในทีม</option>
                <option value="public">🌐 สาธารณะ</option>
              </select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-800">
                คำอธิบาย *
              </label>
              <textarea
                name="description"
                rows={4}
                defaultValue={initialDescription}
                placeholder="กรอกรายละเอียดเพิ่มเติมเกี่ยวกับเอกสาร"
                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-300"
                required
              />
            </div>

            {message && (
              <div className="fixed inset-x-0 top-16 z-50 flex justify-center px-4">
                <div
                  className={`flex max-w-md items-center gap-2 rounded-full border px-4 py-2 text-[11px] shadow-lg ${
                    isSuccess
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  <span>{isSuccess ? "✅" : "⚠️"}</span>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-4 text-[11px] font-medium">
              <button
                type="button"
                disabled={isSaving}
                className="flex items-center gap-2 rounded-full bg-indigo-700 px-7 py-2.5 text-white shadow-md hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => setShowConfirmSave(true)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                  ✏️
                </span>
                <span>{isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</span>
              </button>
              <button
                type="button"
                className="flex items-center gap-2 rounded-full bg-rose-600 px-7 py-2.5 text-white shadow-md hover:bg-rose-700"
                onClick={() => {
                  setShowConfirmCancel(true);
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/20 text-[11px]">
                  ✖
                </span>
                <span>ยกเลิก</span>
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Confirm save modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-xs text-slate-800 shadow-lg">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-indigo-700">
              <span>⚠️</span>
              <span>ยืนยันการบันทึกการแก้ไข</span>
            </h2>
            <p className="mb-4 text-[11px] text-slate-600">
              คุณต้องการบันทึกการแก้ไขเอกสาร "{initialTitle || "(ยังไม่มีชื่อเอกสาร)"}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="rounded-full bg-slate-200 px-4 py-1.5 text-slate-700 hover:bg-slate-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSave(false);
                  const formEl = document.getElementById("edit-form") as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                className="rounded-full bg-indigo-700 px-4 py-1.5 text-white shadow hover:bg-indigo-800"
              >
                ยืนยันการบันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm cancel modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 text-xs text-slate-800 shadow-lg">
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-rose-700">
              <span>⚠️</span>
              <span>ยืนยันการยกเลิกการแก้ไข</span>
            </h2>
            <p className="mb-4 text-[11px] text-slate-600">
              คุณต้องการยกเลิกการแก้ไขเอกสาร "{initialTitle || "(ยังไม่มีชื่อเอกสาร)"}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="rounded-full bg-slate-200 px-4 py-1.5 text-slate-700 hover:bg-slate-300"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmCancel(false);
                  const formEl = document.getElementById("edit-form") as HTMLFormElement | null;
                  if (formEl) {
                    formEl.reset();
                  }
                  const now = new Date();
                  const iso = now.toISOString();
                  const local = iso.slice(0, 10);
                  setCurrentDateTime(local);
                  setIsSuccess(false);
                  setMessage("ยกเลิกการแก้ไขเอกสารแล้ว");
                  setSelectedFiles([]);

                  const idParam = searchParams.get("id");
                  const target = idParam
                    ? `/detail?id=${encodeURIComponent(idParam)}`
                    : "/search";

                  setTimeout(() => {
                    router.push(target);
                  }, 1200);
                }}
                className="rounded-full bg-rose-600 px-4 py-1.5 text-white shadow hover:bg-rose-700"
              >
                ยืนยันการยกเลิก
              </button>
            </div>
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
