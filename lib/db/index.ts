import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

let sqlClient: NeonQueryFunction<boolean, boolean> | null = null;

function getDbClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured in environment variables");
  }

  if (!sqlClient) {
    sqlClient = neon(connectionString);
  }

  return drizzle(sqlClient, { schema });
}

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_target, prop) {
    const client = getDbClient();
    return (client as unknown as Record<string, unknown>)[prop as string];
  },
});

export * from "./schema";
