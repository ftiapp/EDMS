"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

type NavbarDepartmentInfo = {
  employeeId: number;
  email: string;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode: string | null;
  departmentNameEn: string | null;
};

export default function UserNavbar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";
  const query = email ? `?email=${encodeURIComponent(email)}` : "";
  const [deptLabel, setDeptLabel] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      // ถ้าไม่มีอีเมล (ถือว่าเซสชันไม่สมบูรณ์) ให้กลับไปหน้า Login ของระบบพนักงาน
      if (typeof window !== "undefined") {
        window.location.href =
          "https://employee-management-9yicp.kinsta.app/login";
      }
      setDeptLabel(null);
      return;
    }

    let cancelled = false;

    fetch(`/api/hr/department?email=${encodeURIComponent(email)}`)
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) {
            if (!cancelled) setDeptLabel(null);
            return;
          }
          throw new Error("Failed to load department in navbar");
        }
        const data: NavbarDepartmentInfo = await res.json();
        if (!cancelled) {
          setDeptLabel(
            data.departmentName ??
              data.departmentNameEn ??
              data.departmentCode ??
              null
          );
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error(err);
          setDeptLabel(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  const isHome = pathname === "/";
  const isDocument = pathname === "/document";
  const isSearch =
    pathname === "/search" || pathname === "/edit" || pathname === "/detail";

  return (
    <header className="sticky top-0 z-50 bg-indigo-800 text-white shadow">
      <div className="flex h-14 w-full items-stretch">
        <div className="flex items-stretch">
          <Link
            href={`/${query}`}
            className="flex items-center bg-white pl-3 pr-8 text-indigo-800 sm:pl-6 sm:pr-10"
          >
            <div className="flex items-center gap-2">
              <img src="/fti-logo.png" alt="EDMS" className="h-7 w-auto sm:h-8" />
              <span className="text-base font-semibold tracking-wide sm:text-lg">
                EDMS
              </span>
            </div>
          </Link>
          <div className="header-logo-notch h-full w-12 bg-white sm:w-16" />
        </div>

        <nav className="ml-auto flex items-center gap-1 rounded-full bg-indigo-900/30 px-1.5 py-1.5 text-[11px] font-medium sm:gap-3 sm:bg-transparent sm:px-8 sm:py-0">
          {email && (
            <div className="mr-2 hidden items-center rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-1.5 text-[11px] text-slate-900 shadow-sm sm:flex">
              <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-600 text-white">
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
                  <circle cx="12" cy="8" r="3" />
                  <path d="M5 19a7 7 0 0 1 14 0" />
                </svg>
              </div>
              <div className="flex max-w-[210px] flex-col leading-tight">
                <span className="truncate text-[11px] font-semibold text-slate-900">
                  {email}
                </span>
                {deptLabel && (
                  <span className="mt-0.5 flex items-center gap-1 truncate text-[10px] text-slate-500">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                    <span className="truncate">{deptLabel}</span>
                  </span>
                )}
              </div>
            </div>
          )}
          <Link
            href={`/${query}`}
            className={
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 sm:px-4 transition " +
              (isHome
                ? "bg-white text-indigo-800 shadow-sm"
                : "border border-white/60 bg-white/10 text-white hover:bg-white hover:text-indigo-800")
            }
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/80 text-[10px] text-white">
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
                  <path d="M3 11l9-7 9 7" />
                  <path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
                </svg>
              </span>
              <span>หน้าหลัก</span>
            </span>
          </Link>
          <Link
            href={`/document${query}`}
            className={
              "rounded-full px-3 py-1.5 sm:px-4 transition " +
              (isDocument
                ? "bg-white text-indigo-800 shadow-sm"
                : "border border-white/60 bg-white/10 text-white hover:bg-white hover:text-indigo-800")
            }
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
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
              <span>อัปโหลดเอกสาร</span>
            </span>
          </Link>
          <Link
            href={`/search${query}`}
            className={
              "rounded-full px-3 py-1.5 sm:px-4 transition " +
              (isSearch
                ? "bg-white text-indigo-800 shadow-sm"
                : "border border-white/60 bg-white/10 text-white hover:bg-white hover:text-indigo-800")
            }
          >
            <span className="flex items-center gap-1 whitespace-nowrap">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-slate-700 text-[10px] text-white">
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
                  <circle cx="11" cy="11" r="5" />
                  <path d="m16 16 4 4" />
                </svg>
              </span>
              <span>ค้นหาเอกสาร</span>
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
