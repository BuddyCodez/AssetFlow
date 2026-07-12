/**
 * Seed script — uses ONLY HTTP API calls (no Prisma/pg dependency needed).
 *
 * Usage:  export $(grep -v '^#' apps/server/.env | xargs) && bun run packages/infra/seed.ts
 *
 * Prerequisites: Server must be running on localhost:3000
 */

const API_URL = process.env.SERVER_URL || "http://localhost:3000";
const SEED_PASSWORD: string = "Udit@4440";

// ─── Data ───────────────────────────────────────────────────────────────────

const USERS = [
  { email: "admin@assetflow.com", name: "Admin User", role: "ADMIN" },
  { email: "am@assetflow.com", name: "Asset Manager", role: "ASSET_MANAGER" },
  { email: "dh@assetflow.com", name: "Dept Head", role: "DEPARTMENT_HEAD" },
  { email: "employee1@assetflow.com", name: "Employee One", role: "EMPLOYEE" },
  { email: "employee2@assetflow.com", name: "Employee Two", role: "EMPLOYEE" },
];

const DEPARTMENTS = ["Engineering", "Product", "Design", "Operations", "Finance"];
const CATEGORIES = ["Laptops", "Vehicles", "Furniture", "Electronics"];
const ASSETS: Array<{ name: string; cat: string; sn: string; loc: string; bookable: boolean }> = [
  { name: "MacBook Pro 16\"", cat: "Laptops", sn: "SN-MBP-001", loc: "HQ Floor 3", bookable: false },
  { name: "MacBook Air M3", cat: "Laptops", sn: "SN-MBA-001", loc: "HQ Floor 2", bookable: true },
  { name: "Dell XPS 15", cat: "Laptops", sn: "SN-DELL-001", loc: "HQ Floor 1", bookable: false },
  { name: "Lenovo ThinkPad X1", cat: "Laptops", sn: "SN-LEN-001", loc: "HQ Floor 3", bookable: true },
  { name: "Toyota Camry 2024", cat: "Vehicles", sn: "SN-TOY-001", loc: "Parking B2", bookable: true },
  { name: "Honda Civic 2024", cat: "Vehicles", sn: "SN-HON-001", loc: "Parking B1", bookable: true },
  { name: "Ford Transit Van", cat: "Vehicles", sn: "SN-FORD-001", loc: "Parking B2", bookable: false },
  { name: "Herman Miller Aeron", cat: "Furniture", sn: "SN-HM-001", loc: "HQ Floor 2", bookable: false },
  { name: "Standing Desk Pro", cat: "Furniture", sn: "SN-SD-001", loc: "HQ Floor 3", bookable: false },
  { name: "Conference Table 8-Seat", cat: "Furniture", sn: "SN-CT-001", loc: "HQ Floor 1", bookable: true },
  { name: "Sony 85\" 4K Display", cat: "Electronics", sn: "SN-SONY-001", loc: "Conf Room A", bookable: true },
  { name: "Logitech Rally Camera", cat: "Electronics", sn: "SN-LOG-001", loc: "Conf Room B", bookable: true },
  { name: "Shure Microphone Array", cat: "Electronics", sn: "SN-SHURE-001", loc: "Conf Room A", bookable: false },
  { name: "iPad Pro 12.9\"", cat: "Electronics", sn: "SN-IPAD-001", loc: "HQ Floor 2", bookable: true },
  { name: "DJI Pocket 3 Camera", cat: "Electronics", sn: "SN-DJI-001", loc: "Equipment Room", bookable: true },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

let adminCookie = "";

async function api(method: string, path: string, body?: any, extraHeaders?: Record<string, string>) {
  const headers: Record<string, string> = { "Content-Type": "application/json", ...extraHeaders };
  if (adminCookie) headers["Cookie"] = adminCookie;
  const res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const text = await res.text();
  // Capture Set-Cookie for auth
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) adminCookie = setCookie.split(";")[0];
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(text) };
  } catch {
    return { ok: res.ok, status: res.status, data: text };
  }
}

async function rpc(method: string, path: string, body?: any) {
  return api(method.startsWith("/rpc") ? "POST" : method, path, body);
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Starting seed...\n");

  // ─── Step 1: Create users ──────────────────────────────────────────
  console.log("📝 Creating users (password: Udit@4440)...");

  for (const u of USERS) {
    const res = await api("POST", "/api/auth/sign-up/email", { email: u.email, password: SEED_PASSWORD, name: u.name });
    if (res.ok) {
      console.log(`   ✅ ${u.email} (${u.role})`);
    } else if (res.status === 422) {
      console.log(`   ⏭️  ${u.email} — already exists`);
    } else {
      console.log(`   ❌ ${u.email} — ${res.status}`);
    }
    await sleep(200);
  }

  // ─── Step 2: Sign in as admin → create org ─────────────────────────
  console.log("\n🏢 Setting up organization...");
  const signin = await api("POST", "/api/auth/sign-in/email", { email: "admin@assetflow.com", password: SEED_PASSWORD });
  if (!signin.ok) {
    console.error(`❌ Failed to sign in: ${JSON.stringify(signin.data)}`);
    process.exit(1);
  }
  console.log(`   ✅ Signed in as admin`);

  // Create org
  const orgRes = await api("POST", "/api/auth/organization/create", { name: "Acme Corp", slug: "acme-corp" });
  if (orgRes.ok) console.log(`   ✅ Organization created: Acme Corp`);
  else console.log(`   ℹ️  ${JSON.stringify(orgRes.data).slice(0, 150)}`);

  await sleep(300);

  // Let's call the setupAdmin RPC to set our role
  const setupRes = await api("POST", "/rpc/employee/setupAdmin");
  if (setupRes.ok) console.log(`   ✅ Admin role set up`);
  else console.log(`   ℹ️  setupAdmin: ${JSON.stringify(setupRes.data).slice(0, 100)}`);

  // ─── Step 3: Create departments via API ─────────────────────────────
  console.log("\n🏛️  Creating departments...");
  for (const name of DEPARTMENTS) {
    const res = await api("POST", "/rpc/department/create", { name, parentDepartmentId: null, headEmployeeId: null });
    if (res.ok) console.log(`   ✅ ${name}`);
    else console.log(`   ⏭️  ${name}`);
    await sleep(100);
  }

  // ─── Step 4: Create categories via API ──────────────────────────────
  console.log("\n📦 Creating categories...");
  for (const name of CATEGORIES) {
    const res = await api("POST", "/rpc/category/create", { name });
    if (res.ok) console.log(`   ✅ ${name}`);
    else console.log(`   ⏭️  ${name}`);
    await sleep(100);
  }

  // ─── Step 5: Create assets via API ─────────────────────────────────
  console.log("\n💻 Creating assets...");

  // Fetch current categories to map names → IDs
  const catsRes = await api("POST", "/rpc/category/list");
  const catList = Array.isArray(catsRes.data) ? catsRes.data : (catsRes.data?.data || []);
  const catMap = new Map<string, string>();
  for (const c of catList) {
    if (c.name && c.id) catMap.set(c.name, c.id);
  }

  for (const a of ASSETS) {
    const categoryId = catMap.get(a.cat);
    if (!categoryId) {
      console.log(`   ❌ ${a.name} — no category ID for "${a.cat}"`);
      continue;
    }
    const res = await api("POST", "/rpc/asset/register", {
      name: a.name,
      categoryId,
      serialNumber: a.sn,
      location: a.loc,
      isBookable: a.bookable,
      status: "AVAILABLE",
    });
    if (res.ok) console.log(`   ✅ ${a.name}`);
    else {
      const errMsg = typeof res.data === 'string' ? res.data : JSON.stringify(res.data).slice(0, 80);
      console.log(`   ⏭️  ${a.name} — ${errMsg}`);
    }
    await sleep(50);
  }

  console.log("\n" + "═".repeat(50));
  console.log("✅ Seed process started successfully!");
  console.log("   (Some items may be skipped if they already exist)");
  console.log("═".repeat(50));
  console.log("   📋 Login with password 'Udit@4440':");
  for (const u of USERS) {
    console.log(`      ${u.email.padEnd(30)} ${u.role}`);
  }
  console.log();
}

main().catch((e) => {
  console.error("❌ Fatal:", e?.message || e);
  process.exit(1);
});
