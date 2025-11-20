import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      {/* Header */}
      <header className="bg-indigo-800 text-white shadow">
        <div className="flex h-14 w-full items-stretch">
          {/* โลโก้พื้นขาว + มุมเฉียง */}
          <div className="flex items-stretch">
            <div className="flex items-center bg-white px-6">
              <Link href="/" className="flex items-center gap-2 text-indigo-800">
                <img
                  src="/fti-logo.png"
                  alt="EDMS"
                  className="h-8 w-auto"
                />
                <span className="text-lg font-semibold tracking-wide">EDMS</span>
              </Link>
            </div>
            <div className="header-logo-notch h-full w-16 bg-white" />
          </div>

          {/* เมนูพื้นน้ำเงิน */}
          <nav className="ml-auto flex items-center gap-2 px-8 text-xs font-medium">
            <span className="rounded-full bg-white px-4 py-1.5 text-indigo-800 shadow-sm">
              Home
            </span>
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
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-8 pb-16">
        <section className="w-full max-w-2xl rounded-2xl bnorder border-slate-200 bg-white px-8 py-8 text-center shadow-sm">
          <div className="mb-5 space-y-2">
            <h1 className="text-2xl font-semibold text-slate-900">
              ยินดีต้อนรับสู่ระบบ EDMS
            </h1>
            <p className="text-sm text-slate-600">
              ระบบจัดการเอกสารอิเล็กทรอนิกส์สำหรับการจัดเก็บ ค้นหา และแชร์เอกสารภายในองค์กร
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-medium">
            <Link
              href="/document"
              className="flex items-center gap-2 rounded-full bg-emerald-600 px-8 py-2.5 text-white shadow hover:bg-emerald-700"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm">
                📥
              </span>
              <span className="text-[13px]">อัปโหลดเอกสารใหม่</span>
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-2 rounded-full bg-indigo-700 px-8 py-2.5 text-white shadow hover:bg-indigo-800"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm">
                🔍
              </span>
              <span className="text-[13px]">ค้นหา / เอกสารทั้งหมด</span>
            </Link>
            <Link
              href="/search"
              className="flex items-center gap-2 rounded-full bg-slate-700 px-8 py-2.5 text-white shadow hover:bg-slate-800"
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/20 text-sm">
                ✏️
              </span>
              <span className="text-[13px]">แก้ไขเอกสาร</span>
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="mt-auto bg-indigo-800 py-4 text-[11px] text-white">
        <div className="mx-auto flex w-full max-w-5xl items-center px-4">
          {/* โลโก้ใหญ่ ซ้ายสุด */}
          <div className="flex items-center">
            <img
              src="/fti-logo.png"
              alt="FTI"
              className="h-8 w-auto"
            />
          </div>

          {/* ข้อความลิขสิทธิ์ อยู่กึ่งกลางแถบ */}
          <div className="mx-auto flex flex-col items-center text-center text-[11px] leading-snug text-slate-100">
            <span>© 2025 จัดทำโดย ฝ่ายดิจิทัลและเทคโนโลยีสารสนเทศ สภาอุตสาหกรรมแห่งประเทศไทย</span>
            <span>จัดทำโดย นางสาวกัลยรักษ์ โรจนเลิศประเสริฐ</span>
            <span>นิสิตฝึกงาน มหาวิทยาลัยพะเยา</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
