/** Standalone browser test — node scripts/ui-smoke.mjs */
import { chromium } from "playwright";

const API = "http://localhost:8000";
const BASE = "http://localhost:3000";

async function seedSession() {
  const start = await fetch(`${API}/sessions/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patientName: "Samuel Thompson", ageSex: "58 / Male" }),
  });
  const { session } = await start.json();
  const sid = session.id;
  await fetch(`${API}/sessions/${sid}/analyze-transcript-chunk`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chunk_text: "therapeutic exercise lumbar spine gait training modifier 59",
    }),
  });

  const suggestions = await fetch(`${API}/sessions/${sid}/suggestions`).then((r) => r.json());
  if (suggestions[0]?.id) {
    await fetch(`${API}/sessions/${sid}/suggestions/${suggestions[0].id}/apply`, { method: "POST" });
  }

  return sid;
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();
const issues = [];

try {
  const sid = await seedSession();
  await page.goto(`${BASE}/session/${sid}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Start recording so "Current Live CPT" section can appear (Figma: only while session is live)
  const resumeBtn = page.getByRole("button", { name: /Resume/i });
  if (await resumeBtn.isVisible().catch(() => false)) {
    await resumeBtn.click();
    await page.waitForTimeout(500);
  }

  const patient = await page.locator("text=Samuel Thompson").isVisible({ timeout: 10000 }).catch(() => false);
  if (!patient) issues.push("Patient header not visible after load");

  const swipeVisible = await page.locator("text=Slide to Approve").first().waitFor({ timeout: 10000 }).then(() => true).catch(() => false);
  if (!swipeVisible) {
    issues.push("No 'Slide to Approve' control visible — detected/billing insights may be missing or status not pending");
  } else {
    const track = page.locator("text=Slide to Approve").first().locator("xpath=ancestor::div[contains(@class,'rounded-full')][1]");
    const box = await track.boundingBox();
    if (box) {
      await page.mouse.move(box.x + 16, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width - 24, box.y + box.height / 2, { steps: 15 });
      await page.mouse.up();
      await page.waitForTimeout(400);
      const approved = await page.locator("text=Approved").first().isVisible();
      if (!approved) {
        issues.push("BUG CONFIRMED: Slide-to-approve does not complete after drag — stale isSwiping state blocks pointermove on first gesture");
      }
    }
  }

  const timelineDots = await page.locator("[data-insight-dot]").count();
  if (timelineDots === 0) {
    issues.push("Figma gap: insight timeline missing blue dot connectors on dashed line");
  }

  const liveCpt = await page.locator("text=Current Live CPT").isVisible();
  if (!liveCpt) {
    issues.push("Figma gap: suggestions panel missing 'Current Live CPT' section");
  }

  const unitRecorded = await page.locator("text=Unit Recorded").isVisible();
  if (!unitRecorded) {
    issues.push("Figma gap: suggestions panel missing 'Unit Recorded' cards");
  }

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload({ waitUntil: "networkidle" });
  const insightsTab = await page.getByRole("button", { name: /Insights/i }).isVisible();
  const suggestionsTab = await page.getByRole("button", { name: /Suggestions/i }).isVisible();
  if (!insightsTab || !suggestionsTab) {
    issues.push("Mobile: Insights/Suggestions tab switcher not visible");
  }

  await page.screenshot({ path: "test-results/ui-smoke-mobile.png", fullPage: true });
} catch (e) {
  issues.push(`Test error: ${e.message}`);
} finally {
  await browser.close();
}

console.log("\n=== FRONTEND UI TEST RESULTS ===\n");
if (issues.length === 0) {
  console.log("No issues detected.");
} else {
  issues.forEach((i, n) => console.log(`${n + 1}. ${i}`));
}
