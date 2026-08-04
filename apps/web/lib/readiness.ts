import net from "node:net";
import pg from "pg";

import { serverEnvironment } from "@/lib/env";

type ServiceStatus = "ok" | "error";

type ServiceCheck = {
  latencyMs: number;
  status: ServiceStatus;
};

type ReadinessCheck = {
  checkedAt: string;
  service: "lumi-web";
  services: {
    postgres: ServiceCheck;
    redis: ServiceCheck;
  };
  schema: {
    /** true if critical tables exist in the `profile` schema */
    profileSchemaReady: boolean;
    /** true if critical auth tables exist */
    authSchemaReady: boolean;
  };
  status: ServiceStatus;
};

const DEFAULT_TIMEOUT_MS = 1_500;

function getPort(url: URL) {
  if (url.port) {
    return Number(url.port);
  }

  if (url.protocol === "postgresql:" || url.protocol === "postgres:") {
    return 5432;
  }

  if (url.protocol === "redis:") {
    return 6379;
  }

  throw new Error(`Unsupported service protocol: ${url.protocol}`);
}

async function measure(check: () => Promise<void>): Promise<ServiceCheck> {
  const startedAt = Date.now();

  try {
    await check();

    return {
      latencyMs: Date.now() - startedAt,
      status: "ok",
    };
  } catch {
    return {
      latencyMs: Date.now() - startedAt,
      status: "error",
    };
  }
}

export function checkTcpUrl(urlText: string, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const url = new URL(urlText);
  const port = getPort(url);

  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({
      host: url.hostname,
      port,
      timeout: timeoutMs,
    });

    socket.once("connect", () => {
      socket.end();
      resolve();
    });

    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${url.hostname}:${port}`));
    });

    socket.once("error", reject);
  });
}

export function checkRedisPing(
  urlText: string,
  timeoutMs = DEFAULT_TIMEOUT_MS,
) {
  const url = new URL(urlText);
  const port = getPort(url);

  return new Promise<void>((resolve, reject) => {
    const socket = net.createConnection({
      host: url.hostname,
      port,
      timeout: timeoutMs,
    });

    socket.once("connect", () => {
      socket.write("*1\r\n$4\r\nPING\r\n");
    });

    socket.on("data", (data) => {
      if (data.toString().includes("+PONG")) {
        socket.end();
        resolve();
        return;
      }

      socket.destroy();
      reject(new Error("Redis did not return PONG"));
    });

    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`Timed out connecting to ${url.hostname}:${port}`));
    });

    socket.once("error", reject);
  });
}

export async function getReadiness(): Promise<ReadinessCheck> {
  const [postgres, redis] = await Promise.all([
    measure(() => checkTcpUrl(serverEnvironment.DATABASE_URL)),
    measure(() => checkRedisPing(serverEnvironment.REDIS_URL)),
  ]);

  let profileSchemaReady = false;
  let authSchemaReady = false;

  if (postgres.status === "ok") {
    try {
      const pool = new pg.Pool({
        connectionString: serverEnvironment.DATABASE_URL,
      });
      try {
        const [profileResult, authResult] = await Promise.all([
          pool.query("SELECT to_regclass('profile.households') AS r"),
          pool.query("SELECT to_regclass('parent_accounts') AS r"),
        ]);
        profileSchemaReady = profileResult.rows[0]?.r !== null;
        authSchemaReady = authResult.rows[0]?.r !== null;
      } finally {
        await pool.end();
      }
    } catch {
      // schema check failure → keep both as false
    }
  }

  const schemaOk = profileSchemaReady && authSchemaReady;
  const status: ServiceStatus =
    postgres.status === "ok" && redis.status === "ok" && schemaOk
      ? "ok"
      : "error";

  return {
    checkedAt: new Date().toISOString(),
    service: "lumi-web",
    services: {
      postgres,
      redis,
    },
    schema: {
      profileSchemaReady,
      authSchemaReady,
    },
    status,
  };
}
