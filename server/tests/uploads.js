// Helpers for tests that upload files. Uploaded files go to the real (private) bucket under a
// throw-away folder, and `cleanupStorage` deletes them again when the test file ends.
import { randomBytes } from "node:crypto";

/** Call BEFORE startTestApp(): every file this test file stores lands under tests/<random>/. */
export function useTestStoragePrefix() {
  process.env.STORAGE_PREFIX = `tests/${randomBytes(4).toString("hex")}/`;
}

export const pdfBytes = (extra = 64) => Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(extra, 65)]);
export const jpegBytes = () => Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 2)]);
export const webpBytes = () =>
  Buffer.concat([Buffer.from("RIFF"), Buffer.from([64, 0, 0, 0]), Buffer.from("WEBP"), Buffer.alloc(64, 3)]);
export const pngBytes = () =>
  Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)]);

/** POSTs a multipart form with one file field, using a test client's cookies. */
export async function upload(
  ctx,
  client,
  path,
  { name = "certificate.pdf", type = "application/pdf", bytes = pdfBytes() } = {},
) {
  const cookie = Object.entries(client.cookies())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  const form = new FormData();
  form.append("file", new Blob([bytes], { type }), name);
  const response = await fetch(`${ctx.baseUrl}${path}`, {
    method: "POST",
    headers: cookie ? { cookie } : {},
    body: form,
  });
  const text = await response.text();
  return { status: response.status, body: text ? JSON.parse(text) : null };
}

/** GETs raw bytes (for downloads) using a test client's cookies. */
export async function download(ctx, client, path) {
  const cookie = Object.entries(client.cookies())
    .map(([key, value]) => `${key}=${value}`)
    .join("; ");
  const response = await fetch(`${ctx.baseUrl}${path}`, { headers: cookie ? { cookie } : {} });
  return {
    status: response.status,
    type: response.headers.get("content-type"),
    cacheControl: response.headers.get("cache-control"),
    bytes: Buffer.from(await response.arrayBuffer()),
  };
}

/** Deletes every file the test run stored (certificates, message attachments and profile photos). */
export async function cleanupStorage(ctx) {
  const { deleteObject } = await import("../src/services/storage.js");
  const keys = [
    ...(await ctx.prisma.doctorCertificate.findMany({ select: { storageKey: true } })),
    ...(await ctx.prisma.messageAttachment.findMany({ select: { storageKey: true } })),
    ...(
      await ctx.prisma.user.findMany({ where: { photoKey: { not: null } }, select: { photoKey: true } })
    ).map((row) => ({ storageKey: row.photoKey })),
  ].map((row) => row.storageKey);
  await Promise.all(keys.map((key) => deleteObject(key).catch(() => undefined)));
}
