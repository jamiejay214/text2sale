import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import vm from "node:vm";
import ts from "typescript";

const ownerId = "1679d7e5-422a-4676-b407-a25b5ef7e69c";
const otherId = "b7791d04-f7b3-4cbb-8d99-32cd2a90d607";
const pdf = "%PDF-1.7\nEIN certificate test fixture";

function harness({ authenticated = true, caller = ownerId, adminAllowed = false, publicBucket = false, uploadFails = false, previous = false, legacy = false, listFails = false } = {}) {
  const events = [];
  let files = previous ? [{ id: "old-file", name: legacy ? "ein-100.pdf" : "ein-100-old--IRS letter.pdf", created_at: "2026-10-03T18:00:00Z", metadata: { size: 128, mimetype: "application/pdf" } }] : [];
  const registration = { status: "brand_approved", brandRegistrationSid: "verified-brand", campaignSid: "pending-campaign", einCertificatePath: `${ownerId}/ein-100.pdf`, einCertificateName: "Original IRS letter.pdf" };
  const bucket = {
    async list(prefix, options) {
      events.push({ type: "list", prefix, options });
      return { data: files.slice(0, options.limit), error: listFails ? { message: "Unavailable" } : null };
    },
    async upload(path, bytes, options) {
      events.push({ type: "upload", path, bytes, options });
      if (uploadFails) return { error: { message: "Unavailable" } };
      files.unshift({ id: randomUUID(), name: path.slice(path.indexOf("/") + 1), created_at: new Date().toISOString(), metadata: { size: bytes.length, mimetype: options.contentType } });
      return { error: null };
    },
    async remove(paths) { events.push({ type: "remove", paths }); files = files.filter((file) => !paths.includes(`${ownerId}/${file.name}`)); return { error: null }; },
    async createSignedUrl(path, seconds, options) { events.push({ type: "sign", path, seconds, options }); return { data: { signedUrl: "https://storage.example.test/private?signed=yes" }, error: null }; },
  };
  const db = {
    storage: {
      async getBucket(id) { assert.equal(id, "ein-certificates"); events.push({ type: "bucket" }); return { data: { public: publicBucket }, error: null }; },
      from(id) { assert.equal(id, "ein-certificates"); return bucket; },
    },
    from(table) {
      assert.equal(table, "profiles");
      const query = {
        select() { return query; }, eq() { return query; }, single: async () => ({ data: { a2p_registration: registration }, error: null }),
        update() { throw new Error("Certificate uploads must never rewrite the registration state"); },
      };
      return query;
    },
  };
  class NextResponse extends Response { static json(value, init) { return new NextResponse(JSON.stringify(value), init); } }
  const modules = {
    "server-only": {}, "node:crypto": { randomUUID },
    "next/server": { NextResponse }, "@supabase/supabase-js": { createClient: () => db },
    "@/lib/auth-guard": {
      authenticate: async () => authenticated ? { ok: true, user: { id: caller } } : { ok: false, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) },
      requireSameUser: (authed, requested) => authed === requested ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 }),
      requireAdmin: async () => { events.push({ type: "admin-check" }); return adminAllowed ? null : NextResponse.json({ error: "Forbidden" }, { status: 403 }); },
    },
  };
  const load = (path) => {
    const exports = {};
    const code = ts.transpileModule(readFileSync(new URL(`../${path}`, import.meta.url), "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    vm.runInNewContext(code, { exports, require: (name) => { if (!(name in modules)) throw new Error(`Unmocked import ${name}`); return modules[name]; }, File, Uint8Array, process: { env: {} } });
    return exports;
  };
  const shared = load("lib/ein-certificate.ts");
  modules["./ein-certificate"] = modules["@/lib/ein-certificate"] = shared;
  modules["@/lib/ein-certificate-storage"] = load("lib/ein-certificate-storage.ts");
  const uploadRoute = load("app/api/upload-ein-certificate/route.ts");
  const readRoute = load("app/api/ein-certificate-url/route.ts");
  return {
    events, registration, shared,
    async upload({ content = pdf, name = "IRS letter.pdf", type = "application/pdf", userId = ownerId } = {}) {
      const form = new FormData(); form.append("userId", userId); form.append("file", new File([content], name, { type }));
      return uploadRoute.POST(new Request("https://example.test/api/upload-ein-certificate", { method: "POST", body: form }));
    },
    read: (body = {}) => readRoute.POST(new Request("https://example.test/api/ein-certificate-url", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ userId: ownerId, ...body }),
    })),
  };
}

test("certificate upload and metadata require authentication and enforce account ownership", async () => {
  const anonymous = harness({ authenticated: false });
  assert.equal((await anonymous.upload()).status, 401);
  assert.equal((await anonymous.read()).status, 401);
  assert.equal(anonymous.events.length, 0);
  const foreign = harness({ caller: otherId });
  assert.equal((await foreign.upload()).status, 403);
  assert.equal((await foreign.read({ metadataOnly: true })).status, 403);
  assert.equal(foreign.events.filter((event) => event.type === "list" || event.type === "sign" || event.type === "upload").length, 0);
});

test("upload survives registration changes and reloads from private storage without registration metadata", async () => {
  const h = harness();
  const snapshot = JSON.stringify(h.registration);
  const response = await h.upload();
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal((await response.json()).certificate.name, "IRS letter.pdf");
  assert.equal(JSON.stringify(h.registration), snapshot);
  delete h.registration.einCertificatePath;
  h.registration.status = "campaign_pending";
  const read = await h.read({ metadataOnly: true });
  const data = await read.json();
  assert.equal(data.certificate.name, "IRS letter.pdf");
  assert.equal(data.certificate.type, "application/pdf");
  assert.equal(data.certificate.path, undefined);
  assert.equal(data.url, undefined);
  assert.equal(h.events.filter((event) => event.type === "sign").length, 0);
});

test("replacing a certificate deletes the previous file only after the new one is saved", async () => {
  const h = harness({ previous: true });
  assert.equal((await h.upload()).status, 200);
  assert.ok(h.events.findIndex((event) => event.type === "upload") < h.events.findIndex((event) => event.type === "remove"));
  assert.deepEqual(Array.from(h.events.find((event) => event.type === "remove").paths), [`${ownerId}/ein-100-old--IRS letter.pdf`]);
  const failing = harness({ previous: true, uploadFails: true });
  assert.equal((await failing.upload()).status, 500);
  assert.equal(failing.events.filter((event) => event.type === "remove").length, 0);
  assert.equal((await (await failing.read({ metadataOnly: true })).json()).certificate.name, "IRS letter.pdf");
});

test("private-bucket checks fail closed and storage outages are distinct from no document", async () => {
  const h = harness({ publicBucket: true });
  assert.equal((await h.upload()).status, 500);
  assert.equal((await h.read()).status, 500);
  assert.equal(h.events.filter((event) => event.type === "upload" || event.type === "sign").length, 0);
  const outage = harness({ listFails: true });
  assert.equal((await outage.read({ metadataOnly: true })).status, 500);
  const empty = harness();
  assert.equal((await empty.read()).status, 404);
  assert.equal((await (await empty.read({ metadataOnly: true })).json()).certificate, null);
});

test("signed links expire after five minutes with separate view and download modes", async () => {
  const h = harness({ previous: true });
  assert.equal((await h.read({ view: true })).status, 200);
  assert.equal((await h.read()).status, 200);
  const signed = h.events.filter((event) => event.type === "sign");
  assert.equal(signed[0].seconds, 300);
  assert.equal(signed[0].options, undefined);
  assert.equal(signed[1].options.download, "IRS letter.pdf");
  const admin = harness({ caller: otherId, adminAllowed: true, previous: true });
  assert.equal((await admin.read({ view: true })).status, 200);
  assert.equal(admin.events.filter((event) => event.type === "admin-check").length, 1);
  assert.equal((await admin.upload()).status, 403);
});

test("legacy certificates remain readable and folder traversal is rejected", async () => {
  const h = harness({ previous: true, legacy: true });
  assert.equal((await (await h.read({ metadataOnly: true })).json()).certificate.name, "Original IRS letter.pdf");
  for (const userId of ["../other", "", 123, null]) assert.equal((await h.read({ userId })).status, 400);
});

test("empty, oversized, unsupported, and renamed executable files are rejected before upload", async () => {
  const h = harness();
  for (const file of [{ content: "" }, { content: "<html>not a PDF</html>" }, { type: "text/html", name: "bad.html" }, { content: new Uint8Array(4 * 1024 * 1024 + 1) }]) {
    assert.equal((await h.upload(file)).status, 400);
  }
  assert.equal(h.events.filter((event) => event.type === "upload").length, 0);
  // Some operating systems provide no MIME type for PDFs; their contents still must match.
  assert.equal((await h.upload({ type: "", name: "EIN.PDF" })).status, 200);
});

test("supported image signatures upload with canonical types and safe, unique storage paths", async () => {
  const h = harness();
  const images = [
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/jpg", [0xff, 0xd8, 0xff]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]],
  ];
  for (const [type, content] of images) assert.equal((await h.upload({ type, content: new Uint8Array(content), name: "../../IRS<>letter.bad" })).status, 200);
  const uploads = h.events.filter((event) => event.type === "upload");
  assert.equal(new Set(uploads.map((event) => event.path)).size, 3);
  for (const event of uploads) {
    assert.equal(event.path.split("/").length, 2);
    assert.equal(event.options.upsert, false);
    assert.equal(event.options.cacheControl, "0");
  }
  assert.equal(uploads[1].options.contentType, "image/jpeg");
});
