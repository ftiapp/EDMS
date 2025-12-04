"use client";

import Link from "next/link";
import UserNavbar from "../components/UserNavbar";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

const ALLOWED_DEPARTMENTS = [
  "ผู้อำนวยการใหญ่",
  "สถาบันรหัสสากล",
  "ฝ่ายตรวจสอบ",
  "งานสำนักงานประธานและเลขาธิการ",
  "ฝ่ายส่งเสริมและสนับสนุนอุตสาหกรรม",
  "ฝ่ายส่งเสริมและสนับสนุนสภาอุตสาหกรรมจังหวัด",
  "ฝ่ายทะเบียนสมาชิก",
  "ฝ่ายสมาชิกสัมพันธ์ กิจกรรมและรายได้",
  "สถาบันวิสาหกิจขนาดกลางและขนาดย่อมอุตสาหกรรมการผลิต",
  "ฝ่ายเศรษฐกิจและวิชาการ",
  "ฝ่ายต่างประเทศ",
  "ฝ่ายการค้าและการลงทุน",
  "งานอาเซียนและโลจิสติกส์",
  "สถาบันการเปลี่ยนแปลงสภาพภูมิอากาศ",
  "สถาบันพลังงานเพื่ออุตสาหกรรม",
  "สถาบันน้ำและสิ่งแวดล้อมเพื่อความยั่งยืน",
  "สถาบันการจัดการบรรจุภัณฑ์และรีไซเคิลเพื่อสิ่งแวดล้อม",
  "สถาบันอุตสาหกรรมเกษตร",
  "สถาบันนวัตกรรมเพื่ออุตสาหกรรม",
  "สถาบันดิจิทัลเพื่ออุตสาหกรรม",
  "สถาบันพัฒนาอุตสาหกรรมสร้างสรรค์และซอฟต์พาวเวอร์",
  "สถาบันเสริมสร้างขีดความสามารถมนุษย์",
  "งานพัฒนานักอุตสาหกรรม",
  "งานพัฒนาทักษะบุคลากรภาคอุตสาหกรรม",
  "งานแรงงาน",
  "ฝ่ายสื่อสารองค์กร",
  "ฝ่ายกฎหมาย",
  "ฝ่ายงานกรรมการและบริหารสำนักงาน",
  "ฝ่ายทรัพยากรมนุษย์",
  "ฝ่ายดิจิทัลเทคโนโลยี",
  "ฝ่ายบัญชีและการเงิน",
  "ฝ่ายธรรมาภิบาลและงานระบบคุณภาพ",
];

export default function EditDocumentPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState("");
  const [currentDateTimeThai, setCurrentDateTimeThai] = useState("");
  const ownerEmail = (searchParams.get("email") ?? "").trim();
  const [initialTitle] = useState(() => searchParams.get("title") ?? "");
  const [initialDepartment] = useState(() => searchParams.get("department") ?? "");
  const [initialTags] = useState(() => searchParams.get("tags") ?? "");
  const [initialDescription] = useState(
    () => searchParams.get("description") ?? ""
  );
  const [existingFiles, setExistingFiles] = useState<
    { url: string; name: string }[]
  >([]);
  const [shareTo, setShareTo] = useState<"private" | "team" | "public">("private");
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

  // โหลดรายการไฟล์เดิมของเอกสาร เพื่อให้ผู้ใช้เห็นว่าตอนนี้มีไฟล์อะไรบ้าง
  useEffect(() => {
    const idParam = searchParams.get("id");
    if (!idParam || !ownerEmail) return;

    const idNum = Number(idParam);
    if (!Number.isFinite(idNum)) return;

    async function fetchExistingFiles() {
      try {
        const res = await fetch(
          `/api/documents?email=${encodeURIComponent(ownerEmail)}`
        );
        if (!res.ok) return;
        const data = await res.json();
        const docs = (data.documents || []) as any[];
        const doc = docs.find((d) => d.id === idNum);
        if (!doc) return;

        const rawUrls = doc.file_url as string | null;
        const rawNames = doc.original_filenames as string | null;
        const rawAccess = (doc.access_level || "").toString().toLowerCase().trim();

        let urls: string[] = [];
        let names: string[] = [];

        if (rawUrls) {
          try {
            const parsed = JSON.parse(rawUrls);
            if (Array.isArray(parsed)) {
              urls = parsed.filter((u): u is string => typeof u === "string");
            }
          } catch {
            // fallback: ไม่ต้องทำอะไร หาก parse ไม่ได้
          }
        }
        if (rawNames) {
          try {
            const parsedNames = JSON.parse(rawNames);
            if (Array.isArray(parsedNames)) {
              names = parsedNames.filter((n): n is string => typeof n === "string");
            }
          } catch {
            // ignore
          }
        }

        const combined: { url: string; name: string }[] = urls.map(
          (url, idx) => ({
            url,
            name: names[idx] || `ไฟล์ที่ ${idx + 1}`,
          })
        );
        setExistingFiles(combined);

        // ตั้งค่า default ของระดับการแชร์ตาม access_level เดิมของเอกสาร
        let normalized: "private" | "team" | "public" = "private";
        if (rawAccess.includes("team") || rawAccess.includes("ทีม")) {
          normalized = "team";
        } else if (rawAccess.includes("public") || rawAccess.includes("สาธารณะ")) {
          normalized = "public";
        }
        setShareTo(normalized);
      } catch (err) {
        console.error("Failed to load existing files for edit page", err);
      }
    }

    fetchExistingFiles();
  }, [ownerEmail, searchParams]);

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

    if (!ownerEmail) {
      setIsSuccess(false);
      setMessage("ไม่พบอีเมลเจ้าของเอกสาร ไม่สามารถแก้ไขได้");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      // อัปเดตไฟล์แนบเดิม/ใหม่ ถ้ามีการเลือกไฟล์ใหม่หรือมีการลบไฟล์เดิม
      const hasSelectedNewFiles = selectedFiles.length > 0;
      const hasExistingChange = existingFiles.length >= 0; // ใช้ existingFiles ปัจจุบันเป็นรายการที่ต้องการเก็บไว้

      if (hasSelectedNewFiles || hasExistingChange) {
        const fileForm = new FormData();
        fileForm.set("id", documentId);
        fileForm.set("email", ownerEmail);
        fileForm.set(
          "existingUrls",
          JSON.stringify(existingFiles.map((f) => f.url))
        );
        fileForm.set(
          "existingNames",
          JSON.stringify(existingFiles.map((f) => f.name))
        );
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

      const res = await fetch(
        `/api/documents?id=${encodeURIComponent(documentId)}&email=${encodeURIComponent(
          ownerEmail
        )}`,
        {
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
        }
      );

      if (!res.ok) {
        throw new Error("Update failed");
      }

      setIsSuccess(true);
      setMessage("บันทึกการแก้ไขเอกสารเรียบร้อยแล้ว!");
      setTimeout(() => {
        const idParam = searchParams.get("id");
        if (idParam) {
          if (ownerEmail) {
            router.push(
              `/detail?id=${encodeURIComponent(idParam)}&email=${encodeURIComponent(
                ownerEmail
              )}`
            );
          } else {
            router.push(`/detail?id=${encodeURIComponent(idParam)}`);
          }
        } else {
          if (ownerEmail) {
            router.push(`/search?email=${encodeURIComponent(ownerEmail)}`);
          } else {
            router.push("/search");
          }
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
      <UserNavbar />

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-6 pb-16">
        <section className="rounded-2xl border border-indigo-100 bg-white px-8 py-6 text-xs shadow md:px-10 md:py-8">
          <h1 className="mb-2 flex items-center gap-2 text-lg font-semibold text-rose-700">
            <span className="text-xl leading-none text-rose-700">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                className="inline-block h-5 w-5 align-middle"
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
                <span className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
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
                    <path d="M12 3v12" />
                    <path d="M8 7l4-4 4 4" />
                    <rect x="4" y="15" width="16" height="4" rx="1" />
                  </svg>
                </span>
                <span className="mb-1 text-xs font-medium text-slate-800">
                  คลิกเพื่อเลือกไฟล์ใหม่
                </span>
                <span className="text-[11px] text-slate-500">
                  หากไม่เลือกไฟล์ใหม่ ระบบจะใช้ไฟล์เดิมต่อไป
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
                            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-slate-100 text-[11px] text-slate-700">
                              {isImage ? (
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
                                  <rect x="3" y="3" width="18" height="18" rx="2" />
                                  <circle cx="8.5" cy="8.5" r="1.5" />
                                  <path d="M21 15l-5-5L5 21" />
                                </svg>
                              ) : ext === "pdf" ? (
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
                              ) : (
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
                                  <path d="M4 4h16v16H4z" />
                                  <path d="M4 9h16" />
                                </svg>
                              )}
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
            </div>

            {/* Existing files overview (after new file picker) */}
            {existingFiles.length > 0 && (
              <div className="space-y-2">
                <label className="block text-[11px] font-medium text-slate-800">
                  ไฟล์เอกสารเดิมที่แนบอยู่ ({existingFiles.length} ไฟล์)
                </label>
                <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-700">
                  <ul className="max-h-40 space-y-1 overflow-y-auto pr-1">
                    {existingFiles.map((file, index) => (
                      <li
                        key={file.url + index}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-1.5 text-[11px] shadow-sm"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-indigo-50 text-[11px] text-indigo-700">
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
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate font-medium text-slate-800">
                              {file.name}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={file.url}
                            target="_blank"
                            rel="noreferrer"
                            className="whitespace-nowrap rounded-full bg-slate-800 px-3 py-1 text-[10px] font-medium text-white hover:bg-black"
                          >
                            เปิดดู
                          </a>
                          <button
                            type="button"
                            className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[10px] text-rose-700 hover:bg-rose-200"
                            onClick={() => {
                              setExistingFiles((prev) =>
                                prev.filter((_, i) => i !== index)
                              );
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
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-[10px] text-slate-500">
                    คุณสามารถลบไฟล์เดิมที่ไม่ต้องการได้โดยกดปุ่มกากบาทด้านขวา หากไม่มีการเลือกไฟล์ใหม่ ระบบจะบันทึกเฉพาะไฟล์เดิมที่เหลืออยู่เมื่อกดบันทึกการแก้ไข
                  </p>
                </div>
              </div>
            )}

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
                <div className="relative">
                  <input
                    name="department"
                    list="departmentList"
                    placeholder="พิมพ์เพื่อค้นหาหรือเลือกฝ่าย/สถาบัน"
                    className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs outline-none placeholder:text-slate-400 focus:border-rose-400 focus:ring-1 focus:ring-rose-300 font-sans"
                    defaultValue={initialDepartment || ""}
                    autoComplete="off"
                    required
                  />
                  <datalist id="departmentList">
                    {ALLOWED_DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </datalist>
                </div>
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
                  ระบบจะตั้งเป็นวันเวลาปัจจุบันให้อัตโนมัติเมื่อแก้ไข
                </p>
              </div>
            </div>

            {/* Share */}
            <div className="mt-3 space-y-1">
              <label className="flex items-center gap-2 text-[11px] font-medium text-slate-800">
                <span className="text-slate-700">
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
                    <circle cx="9" cy="7" r="3" />
                    <circle cx="17" cy="7" r="3" />
                    <path d="M2 21v-1a4 4 0 0 1 4-4h6" />
                    <path d="M22 21v-1a4 4 0 0 0-4-4h-3" />
                  </svg>
                </span>
                <span>แชร์เอกสาร (สิทธิ์การเข้าถึง) *</span>
              </label>
              <select
                name="shareTo"
                className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-xs outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-300"
                value={shareTo}
                onChange={(e) =>
                  setShareTo(
                    (e.target.value as "private" | "team" | "public") || "private"
                  )
                }
                required
              >
                <option value="" disabled>
                  เลือกระดับการแชร์
                </option>
                <option value="private">แชร์ส่วนตัว</option>
                <option value="team">แชร์ภายในหน่วยงาน</option>
                <option value="public">แชร์ทั้งองค์กร</option>
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
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-white/70">
                    {isSuccess ? (
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
                    ) : (
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        className="h-3 w-3 text-rose-600"
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
                    )}
                  </span>
                  <span>{message}</span>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center gap-4 text-[11px] font-medium">
              <button
                type="button"
                disabled={isSaving}
                className="group flex items-center gap-3 rounded-full bg-indigo-700 px-7 py-2.5 text-[12px] font-semibold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-70"
                onClick={() => setShowConfirmSave(true)}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-700 text-[11px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                    <path d="M17 21H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9l3 3v13a2 2 0 0 1-2 2Z" />
                    <path d="M7 3h9v6H7z" />
                    <path d="M9 17h6" />
                  </svg>
                </span>
                <span className="tracking-wide whitespace-nowrap">{isSaving ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}</span>
              </button>
              <button
                type="button"
                className="group flex items-center gap-3 rounded-full bg-rose-600 px-7 py-2.5 text-[12px] font-semibold text-white shadow-lg transition-transform duration-150 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-xl"
                onClick={() => {
                  setShowConfirmCancel(true);
                }}
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-rose-600 text-[11px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                <span className="whitespace-nowrap tracking-wide">ยกเลิก</span>
              </button>
            </div>
          </form>
        </section>
      </main>

      {/* Confirm save modal */}
      {showConfirmSave && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white px-8 py-6 text-sm text-slate-800 shadow-2xl">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-indigo-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-700">
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
                  <path d="M9 12.5 11 14.5 15 10.5" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </span>
              <span>ยืนยันการบันทึกการแก้ไข</span>
            </h2>
            <p className="mb-6 text-[13px] text-slate-600">
              คุณต้องการบันทึกการแก้ไขเอกสาร "{initialTitle || "(ยังไม่มีชื่อเอกสาร)"}" ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3 text-[13px]">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="group flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2 font-medium text-slate-700 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 text-[11px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </span>
                <span className="whitespace-nowrap">ยกเลิก</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmSave(false);
                  const formEl = document.getElementById("edit-form") as HTMLFormElement | null;
                  formEl?.requestSubmit();
                }}
                className="group flex items-center gap-2 rounded-full bg-indigo-700 px-7 py-2 font-semibold text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-indigo-800 hover:shadow-lg"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-indigo-700 text-[11px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                    <path d="M9 12.5 11 14.5 15 10.5" />
                    <circle cx="12" cy="12" r="9" />
                  </svg>
                </span>
                <span className="whitespace-nowrap">ยืนยันการบันทึก</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm cancel modal */}
      {showConfirmCancel && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-lg rounded-3xl bg-white px-8 py-6 text-sm text-slate-800 shadow-2xl">
            <h2 className="mb-3 flex items-center gap-2 text-base font-semibold text-rose-700">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-rose-50 text-rose-700">
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
              <span>ยืนยันการยกเลิกการแก้ไข</span>
            </h2>
            <p className="mb-6 text-[13px] text-slate-600">
              คุณต้องการยกเลิกการแก้ไขเอกสารนี้ และกลับไปหน้าก่อนหน้า ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-3 text-[13px]">
              <button
                type="button"
                onClick={() => setShowConfirmCancel(false)}
                className="group flex items-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-2 font-medium text-slate-700 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-slate-600 text-[11px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                    <path d="M18 6 6 18" />
                    <path d="M6 6l12 12" />
                  </svg>
                </span>
                <span className="whitespace-nowrap">ยกเลิก</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowConfirmCancel(false);
                  router.back();
                }}
                className="group flex items-center gap-2 rounded-full bg-rose-600 px-7 py-2 font-semibold text-white shadow-md transition-transform duration-150 hover:-translate-y-0.5 hover:bg-rose-700 hover:shadow-lg"
              >
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white text-rose-600 text-[11px] transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-1">
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
                    <path d="M12 9v4" />
                    <path d="M12 17h.01" />
                    <path d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                </span>
                <span className="whitespace-nowrap">ยืนยันการยกเลิก</span>
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
              className="h-14 w-auto"
            />
          </div>
          <div className="mx-auto flex flex-col items-center text-center text-[11px] leading-snug text-slate-700">
            <span>© 2025 จัดทำโดย ฝ่ายดิจิทัลและเทคโนโลยี สภาอุตสาหกรรมแห่งประเทศไทย</span>
            <span>จัดทำโดย นางสาวกัลยรักษ์ โรจนเลิศประเสริฐ</span>
            <span>นักศึกษาฝึกงาน มหาวิทยาลัยพะเยา</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
