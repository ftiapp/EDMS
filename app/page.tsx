"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import UserNavbar from "./components/UserNavbar"

type DepartmentInfo = {
	employeeId: number
	email: string
	departmentId: number | null
	departmentName: string | null
	departmentCode: string | null
	departmentNameEn: string | null
}

export default function Home() {
	const searchParams = useSearchParams()
	const email = searchParams.get("email") ?? ""
	const [department, setDepartment] = useState<DepartmentInfo | null>(null)
	const [loadingDept, setLoadingDept] = useState(false)
	const [deptError, setDeptError] = useState<string | null>(null)

	useEffect(() => {
		if (!email) {
			setDepartment(null)
			setDeptError(null)
			return
		}

		let cancelled = false
		setLoadingDept(true)
		setDeptError(null)

		fetch(`/api/hr/department?email=${encodeURIComponent(email)}`)
			.then(async (res) => {
				if (!res.ok) {
					if (res.status === 404) {
						if (!cancelled) {
							setDepartment(null)
						}
						return
					}
					throw new Error("Failed to load department")
				}
				const data: DepartmentInfo = await res.json()
				if (!cancelled) {
					setDepartment(data)
				}
			})
			.catch((err) => {
				if (!cancelled) {
					console.error(err)
					setDeptError("ไม่สามารถดึงข้อมูลฝ่ายจากระบบพนักงานได้")
				}
			})
			.finally(() => {
				if (!cancelled) {
					setLoadingDept(false)
				}
			})

		return () => {
			cancelled = true
		}
	}, [email])

	return (
		<div className="flex min-h-screen flex-col bg-white text-slate-900">
			{/* Header */}
			<UserNavbar />

			{/* Content */}
			<main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-4 py-8 pb-16">
				<section className="w-full max-w-3xl rounded-2xl border border-indigo-100 bg-white px-8 py-8 text-center shadow-sm">
					<div className="mb-6 space-y-3">
						<h1 className="text-3xl font-semibold text-slate-900">
							ระบบบริหารจัดการเอกสารอิเล็กทรอนิกส์ภายในองค์กร
						</h1>
						<p className="text-sm text-slate-600">
							แพลตฟอร์มเพื่อใช้จัดเก็บ ค้นหา และแชร์เอกสารอย่างเป็นระบบ
						</p>
					</div>

					<div className="flex flex-nowrap items-center justify-center gap-4 text-xs font-medium">
						<Link
								href={email ? `/document?email=${encodeURIComponent(email)}` : "/document"}
								className="flex w-[230px] items-center gap-3 rounded-full bg-emerald-600 px-5 py-2.5 text-white shadow hover:bg-emerald-700"
							>
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										className="h-4 w-4 text-emerald-600"
										fill="none"
										stroke="currentColor"
										strokeWidth="2"
										strokeLinecap="round"
										strokeLinejoin="round"
									>
										<path d="M12 3v12" />
										<path d="M8 11l4 4 4-4" />
										<rect x="4" y="15" width="16" height="4" rx="1" />
									</svg>
								</span>
								<span className="flex flex-col items-center text-center leading-tight">
									<span className="text-[13px]">อัปโหลดเอกสารใหม่</span>
									<span className="text-[10px] opacity-60">
										อัปโหลดและจัดเก็บเอกสารในระบบ
									</span>
								</span>
							</Link>
						<Link
								href={email
									? `/search?email=${encodeURIComponent(email)}${
											department?.departmentName
												? `&department=${encodeURIComponent(department.departmentName)}`
												: ""
										}`
									: "/search"}
								className="flex w-[200px] items-center gap-3 rounded-full bg-indigo-700 px-4 py-2.5 text-white shadow hover:bg-indigo-800"
							>
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										className="h-4 w-4 text-indigo-600"
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
								<span className="flex flex-col items-center text-center leading-tight">
									<span className="text-[13px]">ค้นหา / เอกสารทั้งหมด</span>
									<span className="text-[10px] opacity-60">
										ค้นหาเอกสารที่คุณมีสิทธิ์เข้าถึง
									</span>
								</span>
							</Link>
						<Link
								href={email
									? `/my-documents?email=${encodeURIComponent(email)}${
											department?.departmentName
												? `&department=${encodeURIComponent(department.departmentName)}`
												: ""
										}`
									: "/my-documents"}
								className="flex w-[200px] items-center gap-3 rounded-full bg-slate-900 px-4 py-2.5 text-white shadow hover:bg-black"
							>
								<span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										viewBox="0 0 24 24"
										className="h-4 w-4 text-slate-900"
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
								<span className="flex flex-col items-start leading-tight">
									<span className="text-[13px]">เอกสารของฉัน</span>
									<span className="text-[10px] opacity-60">
										จัดการเอกสารที่คุณเป็นเจ้าของ
									</span>
								</span>
							</Link>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="mt-auto border-t border-slate-200 bg-white py-4 text-[11px] text-indigo-900">
				<div className="mx-auto flex w-full max-w-5xl items-center px-4">
					{/* โลโก้ใหญ่ ซ้ายสุด */}
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
	)
}
