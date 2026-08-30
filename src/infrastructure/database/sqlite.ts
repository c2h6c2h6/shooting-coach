import * as SQLite from "expo-sqlite";
import { migrateDatabase } from "./migrations";
import { Database } from "./types";

let databasePromise: Promise<Database> | null = null;

export function getDatabase(): Promise<Database> {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync("shooting-coach.db").then(
      async (database) => {
        const typedDatabase = database as Database;
        await migrateDatabase(typedDatabase);
        return typedDatabase;
      },
    );
  }
  return databasePromise;
}
