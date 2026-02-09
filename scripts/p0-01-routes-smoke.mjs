const candidates = [
  process.env.BASE_URL,
  process.env.NEXT_PUBLIC_APP_URL,
  "http://127.0.0.1:3002",
  "http://localhost:3002",
  "http://127.0.0.1:3001",
  "http://localhost:3001",
].filter(Boolean);

async function fetchWithTimeout(url, init = {}, timeoutMs = 45000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveBaseURL() {
  const probes = ["/en", "/"];
  for (const baseURL of candidates) {
    for (const probe of probes) {
      try {
        const resp = await fetchWithTimeout(`${baseURL}${probe}`, { redirect: "manual" });
        const status = resp.status;
        if (status && status !== 404) return baseURL;
      } catch {
        // ignore and try next
      }
    }
  }
  throw new Error(`No reachable BASE_URL from candidates: ${candidates.join(", ")}`);
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  const baseURL = await resolveBaseURL();

  // P0-02: "/" -> "/en"
  {
    const resp = await fetchWithTimeout(`${baseURL}/`, { redirect: "manual" });
    assert(resp.status === 307 || resp.status === 308, `Expected / to redirect but got status=${resp.status}`);
    const location = resp.headers.get("location");
    assert(location === "/en", `Expected / to redirect to /en but got location=${location}`);
    console.log("P0-02 ok: / redirects to /en");
  }

  // P0-01: marketing routes exist in both locales
  const marketingPaths = [
    "/about",
    "/contact",
    "/privacy",
    "/terms",
    "/cookies",
    "/blog",
    "/careers",
    "/pricing",
  ];

  for (const locale of ["en", "zh"]) {
    for (const path of marketingPaths) {
      const url = `${baseURL}/${locale}${path}`;
      const resp = await fetchWithTimeout(url, { redirect: "manual" }, 120000);
      const status = resp.status;
      assert(status && status !== 404, `Expected route to exist but got status=${status} for ${url}`);
      console.log(`P0-01 ok: /${locale}${path} (status=${status})`);
    }
  }

  console.log("P0-01/P0-02 routes smoke all ok");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

