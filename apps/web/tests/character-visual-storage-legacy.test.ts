import { afterEach, describe, expect, it, vi } from "vitest";

const mockGetObject = vi.fn();
const mockPutObject = vi.fn();
const mockDeleteObject = vi.fn();

vi.mock("../lib/assets/s3-compatible-object-storage", () => ({
  getObject: (...args: unknown[]) => mockGetObject(...args),
  putObject: (...args: unknown[]) => mockPutObject(...args),
  deleteObject: (...args: unknown[]) => mockDeleteObject(...args),
}));

import { readCharacterVisual } from "../lib/assets/character-visual-storage";

const HOUSEHOLD = "51000000-0000-4000-8000-000000000001";
const CHARACTER = "51000000-0000-4000-8000-000000000003";
const JOB = "8a06a69e-1923-46c3-a7ae-fa450aabcea4";
const KEY = `character-visuals/${HOUSEHOLD}/${CHARACTER}/${JOB}/0-body-front.png`;

const notFound = () => {
  throw new Error("OBJECT_STORAGE_GET_FAILED:404");
};

function storageRef(bucket: string) {
  return `s3-character-visual://${encodeURIComponent(bucket)}/${KEY}`;
}

afterEach(() => {
  vi.restoreAllMocks();
  mockGetObject.mockReset();
});

describe("readCharacterVisual legacy double-bucket fallback", () => {
  it("reads the canonical key from the referenced bucket when present", async () => {
    mockGetObject.mockImplementation((_config: unknown, key: string) => {
      if (key === KEY) {
        return { bytes: new Uint8Array([1, 2, 3]), contentType: "image/png" };
      }
      notFound();
    });

    const result = await readCharacterVisual(storageRef("lumi-dev-assets"));
    expect(Buffer.from(result.bytes)).toEqual(Buffer.from([1, 2, 3]));
    expect(mockGetObject).toHaveBeenCalledTimes(1);
    expect(mockGetObject.mock.calls[0]![1]).toBe(KEY);
  });

  it("falls back to the legacy <bucket>/<key> layout when the canonical key 404s", async () => {
    const configBucket = process.env.OBJECT_STORAGE_BUCKET ?? "lumi-dev-assets";
    const referencedBucket = "lumi-dev-assets";
    mockGetObject.mockImplementation((_config: unknown, key: string) => {
      if (key === KEY) notFound();
      if (key === `${referencedBucket}/${KEY}`) {
        return {
          bytes: new Uint8Array([4, 5, 6]),
          contentType: "image/png",
        };
      }
      notFound();
    });

    const result = await readCharacterVisual(storageRef(configBucket));
    expect(Buffer.from(result.bytes)).toEqual(Buffer.from([4, 5, 6]));
    expect(mockGetObject.mock.calls.at(-1)?.[1]).toBe(
      `${referencedBucket}/${KEY}`,
    );
  });

  it("tries both the referenced and current bucket before the legacy layout", async () => {
    const referencedBucket = "lumi-assets";
    const currentBucket = "lumi-dev-assets";
    mockGetObject.mockImplementation((_config: unknown, key: string) => {
      if (key === KEY) notFound();
      if (key === `${referencedBucket}/${KEY}`) {
        return {
          bytes: new Uint8Array([7, 8, 9]),
          contentType: "image/png",
        };
      }
      notFound();
    });

    const result = await readCharacterVisual(storageRef(referencedBucket));
    expect(Buffer.from(result.bytes)).toEqual(Buffer.from([7, 8, 9]));
    const attempted = mockGetObject.mock.calls.map((call) => call[1]);
    expect(attempted[0]).toBe(KEY);
    expect(attempted[1]).toBe(KEY);
    expect(attempted[2]).toBe(`${referencedBucket}/${KEY}`);
    expect(currentBucket).not.toBe(referencedBucket);
  });

  it("falls back to the public URL with the legacy <bucket>/<key> key", async () => {
    const referencedBucket = "lumi-dev-assets";
    mockGetObject.mockImplementation(() => {
      notFound();
    });
    const fetchMock = vi.fn(async (input: string | URL | Request) => {
      const url = String(input);
      if (url.endsWith(`/${referencedBucket}/${KEY}`)) {
        return new Response(new Uint8Array([10, 11, 12]), {
          status: 200,
          headers: { "content-type": "image/png" },
        });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await readCharacterVisual(storageRef(referencedBucket));
    expect(Buffer.from(result.bytes)).toEqual(Buffer.from([10, 11, 12]));
    const urls = fetchMock.mock.calls.map((call) => String(call[0]));
    expect(urls.some((url) => url.endsWith(`/${KEY}`))).toBe(true);
    expect(
      urls.some((url) => url.endsWith(`/${referencedBucket}/${KEY}`)),
    ).toBe(true);
    vi.unstubAllGlobals();
  });

  it("throws OBJECT_STORAGE_GET_FAILED:404 when no layout resolves", async () => {
    mockGetObject.mockImplementation(() => {
      notFound();
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("nf", { status: 404 })),
    );

    await expect(
      readCharacterVisual(storageRef("lumi-dev-assets")),
    ).rejects.toThrow("OBJECT_STORAGE_GET_FAILED:404");
    vi.unstubAllGlobals();
  });
});
