import { createHash } from "node:crypto";

import part00 from "./_exact/part00";
import part01 from "./_exact/part01";
import part02 from "./_exact/part02";
import part03 from "./_exact/part03";
import part04 from "./_exact/part04";
import part05 from "./_exact/part05";
import part06 from "./_exact/part06";
import part07 from "./_exact/part07";
import part08 from "./_exact/part08";
import part09 from "./_exact/part09";
import part10 from "./_exact/part10";
import part11 from "./_exact/part11";

const EXPECTED_BYTES = 33_806;
const EXPECTED_SHA256 =
  "faaae7ea715f4e2d8538a01fffd9429514f4f01601c17b9d7d4885349c5b3648";

const encoded = [
  part00,
  part01,
  part02,
  part03,
  part04,
  part05,
  part06,
  part07,
  part08,
  part09,
  part10,
  part11,
].join("");

const image = Buffer.from(encoded, "base64");
const imageSha256 = createHash("sha256").update(image).digest("hex");

if (image.byteLength !== EXPECTED_BYTES || imageSha256 !== EXPECTED_SHA256) {
  throw new Error("Approved landing artwork failed integrity verification");
}

export const dynamic = "force-static";

export function GET() {
  return new Response(image, {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Length": String(image.byteLength),
      "Content-Type": "image/webp",
      ETag: `"${EXPECTED_SHA256}"`,
    },
  });
}
