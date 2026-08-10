import { createHash, createHmac } from "node:crypto";

export type S3CompatibleObjectStorageConfig = {
  endpoint: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  region?: string;
};

function sha256(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

function hmac(key: string | Buffer, value: string): Buffer {
  return createHmac("sha256", key).update(value).digest();
}

function encodePath(path: string): string {
  return path
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function amzTimestamp(date: Date): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

async function signedRequest(
  config: S3CompatibleObjectStorageConfig,
  method: "GET" | "PUT" | "DELETE",
  key: string,
  body?: Uint8Array,
  contentType?: string,
): Promise<Response> {
  const endpoint = config.endpoint.replace(/\/$/, "");
  const url = new URL(`${endpoint}/${encodeURIComponent(config.bucket)}/${encodePath(key)}`);
  const now = new Date();
  const { amzDate, dateStamp } = amzTimestamp(now);
  const region = config.region ?? "auto";
  const payloadHash = sha256(body ?? new Uint8Array());

  const canonicalHeaders = [
    `host:${url.host}`,
    `x-amz-content-sha256:${payloadHash}`,
    `x-amz-date:${amzDate}`,
  ].join("\n");
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    url.pathname,
    "",
    `${canonicalHeaders}\n`,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");
  const dateKey = hmac(`AWS4${config.secretAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, "s3");
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = createHmac("sha256", signingKey)
    .update(stringToSign)
    .digest("hex");

  const headers = new Headers({
    Authorization: `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  });
  if (contentType) headers.set("Content-Type", contentType);

  const requestInit: RequestInit = { method, headers };
  if (body) requestInit.body = Buffer.from(body);
  return fetch(url, requestInit);
}

export async function putObject(
  config: S3CompatibleObjectStorageConfig,
  key: string,
  bytes: Uint8Array,
  contentType: string,
): Promise<void> {
  const response = await signedRequest(config, "PUT", key, bytes, contentType);
  if (!response.ok) {
    throw new Error(`OBJECT_STORAGE_PUT_FAILED:${response.status}`);
  }
}

export async function getObject(
  config: S3CompatibleObjectStorageConfig,
  key: string,
): Promise<{ bytes: Uint8Array; contentType: string | null }> {
  const response = await signedRequest(config, "GET", key);
  if (!response.ok) {
    throw new Error(`OBJECT_STORAGE_GET_FAILED:${response.status}`);
  }
  return {
    bytes: new Uint8Array(await response.arrayBuffer()),
    contentType: response.headers.get("content-type"),
  };
}

export async function deleteObject(
  config: S3CompatibleObjectStorageConfig,
  key: string,
): Promise<void> {
  const response = await signedRequest(config, "DELETE", key);
  if (!response.ok && response.status !== 404) {
    throw new Error(`OBJECT_STORAGE_DELETE_FAILED:${response.status}`);
  }
}
