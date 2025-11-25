"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function UserNavbar() {
  const pathname = usePathname();

  const isHome = pathname === "/";
  const isDocument = pathname === "/document";
  const isSearch =
    pathname === "/search" || pathname === "/edit" || pathname === "/detail";

  return (
    <header className="bg-indigo-800 text-white shadow">
      <div className="flex h-14 w-full items-stretch">
        <div className="flex items-stretch">
          <Link
            href="/"
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

        <nav className="ml-auto flex items-center gap-1 rounded-full bg-indigo-900/30 px-1 py-1 text-[11px] font-medium sm:gap-2 sm:bg-transparent sm:px-8 sm:py-0">
          <Link
            href="/"
            className={
              "inline-flex items-center gap-1 rounded-full px-3 py-1.5 sm:px-4 transition " +
              (isHome
                ? "bg-white text-indigo-800 shadow-sm"
                : "border border-white/60 bg-white/10 text-white hover:bg-white hover:text-indigo-800")
            }
          >
            <span className="flex items-center gap-1">
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
              <span>Home</span>
            </span>
          </Link>
          <Link
            href="/document"
            className={
              "rounded-full px-3 py-1.5 sm:px-4 transition " +
              (isDocument
                ? "bg-white text-indigo-800 shadow-sm"
                : "border border-white/60 bg-white/10 text-white hover:bg-white hover:text-indigo-800")
            }
          >
            <span className="flex items-center gap-1">
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
              <span>Document</span>
            </span>
          </Link>
          <Link
            href="/search"
            className={
              "rounded-full px-3 py-1.5 sm:px-4 transition " +
              (isSearch
                ? "bg-white text-indigo-800 shadow-sm"
                : "border border-white/60 bg-white/10 text-white hover:bg-white hover:text-indigo-800")
            }
          >
            <span className="flex items-center gap-1">
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
              <span>Search</span>
            </span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
