import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2";

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: process.env.MYSQL_PORT ? Number(process.env.MYSQL_PORT) : 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  connectionLimit: 10,
});

export type Department = {
  code: string;
  name: string;
  nameEn: string | null;
};

type DepartmentRow = RowDataPacket & {
  code: string;
  name: string;
  nameEn: string | null;
};

export async function getDepartments(): Promise<Department[]> {
  const [rows] = await pool.query<DepartmentRow[]>(
    `SELECT DISTINCT code, name, nameEn FROM departments WHERE code IS NOT NULL ORDER BY name`
  );

  return rows.map((row) => ({
    code: row.code,
    name: row.name,
    nameEn: row.nameEn,
  }));
}
