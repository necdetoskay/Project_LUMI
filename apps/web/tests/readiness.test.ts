import net from "node:net";

import { afterEach, describe, expect, it } from "vitest";

import { checkRedisPing, checkTcpUrl } from "@/lib/readiness";

const servers: net.Server[] = [];

function listen(handler?: (socket: net.Socket) => void) {
  return new Promise<{ port: number; server: net.Server }>((resolve) => {
    const server = net.createServer(handler);
    servers.push(server);

    server.listen(0, "127.0.0.1", () => {
      const address = server.address();

      if (!address || typeof address === "string") {
        throw new Error("Expected TCP address");
      }

      resolve({ port: address.port, server });
    });
  });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error) {
              reject(error);
              return;
            }

            resolve();
          });
        }),
    ),
  );
});

describe("readiness checks", () => {
  it("detects an open TCP service", async () => {
    const { port } = await listen();

    await expect(checkTcpUrl(`postgresql://127.0.0.1:${port}/lumi`)).resolves.toBeUndefined();
  });

  it("expects Redis to answer PONG", async () => {
    const { port } = await listen((socket) => {
      socket.on("data", () => {
        socket.write("+PONG\r\n");
      });
    });

    await expect(checkRedisPing(`redis://127.0.0.1:${port}`)).resolves.toBeUndefined();
  });
});
