export type SqlParameter = string | number | null;

export interface RunResult {
  changes: number;
}

export interface Database {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, ...params: SqlParameter[]): Promise<RunResult>;
  getFirstAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T | null>;
  getAllAsync<T>(sql: string, ...params: SqlParameter[]): Promise<T[]>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
