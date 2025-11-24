"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { usePathname } from "next/navigation";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  const isDashboard = pathname === "/admin";
  const isTrash = pathname === "/admin/trash";
  const isDocuments = pathname === "/admin/documents";

  return (
    <div className="flex min-h-screen flex-col bg-white text-slate-900">
      {/* Admin Header (with angled white logo area like user header) */}
      <header className="bg-slate-900 text-white shadow">
        <div className="flex h-14 w-full items-stretch">
          {/* พื้นขาว + มุมเฉียงให้เหมือนหน้า Home */}
          <div className="flex items-stretch">
            <Link
              href="/admin"
              className="flex items-center bg-white pl-3 pr-8 sm:pl-6 sm:pr-10"
            >
              <div className="flex items-center gap-2">
                {/* FTI logo เหมือนฝั่ง user */}
                <img
                  src="/fti-logo.png"
                  alt="FTI"
                  className="h-7 w-auto sm:h-8"
                />
                <span className="text-base font-semibold tracking-wide text-slate-800 sm:text-lg">
                  EDMS
                </span>
              </div>
            </Link>
            <div className="header-logo-notch h-full w-12 bg-white sm:w-16" />
          </div>

          {/* แถบเมนูพื้นน้ำเงินเข้มฝั่งขวา */}
          <div className="ml-auto flex items-center justify-between gap-2 px-2 text-[10px] font-medium sm:gap-4 sm:px-6 sm:text-[11px]">
            <span className="hidden rounded-full bg-amber-500/20 px-3 py-1 text-[11px] font-semibold text-amber-200 md:inline">
              สำหรับผู้ดูแลระบบ (Admin)
            </span>

            {/* ทำให้เมนูเลื่อนในแนวนอนบนจอแคบ */}
            <nav className="flex items-center gap-2 overflow-x-auto whitespace-nowrap rounded-full bg-slate-900/40 px-1 py-1 sm:bg-transparent sm:px-0">
              {/* ปุ่มแดชบอร์ด */}
              <Link
                href="/admin"
                className={
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm transition " +
                  (isDashboard
                    ? "border border-white bg-white text-slate-900"
                    : "border border-indigo-200 bg-indigo-500/20 text-indigo-100 hover:bg-indigo-500/30 hover:border-indigo-300")
                }
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/80 text-[10px]">
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
                    <polygon points="16 8 12 16 8 12 16 8" />
                  </svg>
                </span>
                <span>Dashboard</span>
              </Link>

              {/* ปุ่มถังขยะเอกสาร */}
              <Link
                href="/admin/trash"
                className={
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm transition " +
                  (isTrash
                    ? "border border-white bg-white text-rose-700"
                    : "border border-rose-200 bg-rose-500/20 text-rose-100 hover:bg-rose-500/30 hover:border-rose-300")
                }
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/80 text-[10px]">
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
                    <path d="M3 6h18" />
                    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <line x1="10" y1="11" x2="10" y2="17" />
                    <line x1="14" y1="11" x2="14" y2="17" />
                  </svg>
                </span>
                <span>Trash</span>
              </Link>

              {/* ปุ่มจัดการเอกสารทั้งหมด */}
              <Link
                href="/admin/documents"
                className={
                  "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-medium shadow-sm transition " +
                  (isDocuments
                    ? "border border-white bg-white text-slate-900"
                    : "border border-slate-300 bg-slate-100/20 text-slate-100 hover:bg-slate-100/30 hover:border-slate-200")
                }
              >
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-amber-300 text-[10px] text-slate-900">
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
                <span>Documents</span>
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Admin Content */}
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-4 px-4 py-6">
        {children}
      </main>

      {/* Admin Footer - styled like Home footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-4 text-[11px] text-indigo-900">
        <div className="mx-auto flex w-full max-w-6xl items-center px-4">
          {/* Logo left, same as Home */}
          <div className="flex items-center">
            <img src="/fti-logo.png" alt="FTI" className="h-14 w-auto" />
          </div>

          {/* Center text block for admin info */}
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
