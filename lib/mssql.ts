import sql, { config as SqlConfig } from "mssql";

const sqlConfig: SqlConfig = {
  user: process.env.MSSQL_USER,
  password: process.env.MSSQL_PASSWORD,
  server: process.env.MSSQL_SERVER || "",
  database: process.env.MSSQL_DATABASE,
  options: {
    encrypt: process.env.MSSQL_ENCRYPT === "true",
    trustServerCertificate: process.env.MSSQL_TRUST_SERVER_CERTIFICATE === "true",
  },
};

let poolPromise: Promise<sql.ConnectionPool> | null = null;

async function getConnectionPool() {
  if (!poolPromise) {
    poolPromise = sql.connect(sqlConfig);
  }
  return poolPromise;
}

export type Department = {
  DepartmentCode: string;
  Department_Name_TH: string;
};

export async function getDepartments(): Promise<Department[]> {
  const pool = await getConnectionPool();
  const result = await pool
    .request()
    .query<Department>(`
      SELECT DISTINCT
        DepartmentCode,
        Department_Name_TH
      FROM [K2FTI].[dbo].[Master_EmployeeInfo_TableView_Active]
      WHERE Active = 1 AND DepartmentCode IS NOT NULL
      ORDER BY Department_Name_TH
    `);

  return result.recordset;
}
