import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

let pool: mysql.Pool | null = null;

function getEmployeePool() {
  if (!pool) {
    const url = process.env.EMPLOYEE_PORTAL_DATABASE_URL;

    if (!url) {
      throw new Error("EMPLOYEE_PORTAL_DATABASE_URL is not set in env");
    }

    pool = mysql.createPool(url);
  }

  return pool;
}

export type EmployeeDepartment = {
  employeeId: number;
  email: string;
  departmentId: number | null;
  departmentName: string | null;
  departmentCode: string | null;
  departmentNameEn: string | null;
};

type EmployeeDepartmentRow = RowDataPacket & {
  id: number;
  email: string;
  departmentId: number | null;
  deptName: string | null;
  deptCode: string | null;
  deptNameEn: string | null;
};

export async function getDepartmentByEmail(
  email: string
): Promise<EmployeeDepartment | null> {
  const db = getEmployeePool();

  const [rows] = await db.query<EmployeeDepartmentRow[]>(
    `SELECT e.id,
            e.email,
            e.departmentId,
            d.name       AS deptName,
            d.code       AS deptCode,
            d.nameEn     AS deptNameEn
     FROM employees e
     LEFT JOIN departments d ON d.id = e.departmentId
     WHERE e.email = ?
     LIMIT 1`,
    [email]
  );

  if (rows.length === 0) return null;

  const row = rows[0];

  return {
    employeeId: row.id,
    email: row.email,
    departmentId: row.departmentId,
    departmentName: row.deptName,
    departmentCode: row.deptCode,
    departmentNameEn: row.deptNameEn,
  };
}
