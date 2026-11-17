import { expect, test, type Page } from "@playwright/test";

async function checkLoraGlyphs(page: Page) {
  await page.evaluate(async () => {
    const sample = document.createElement("div");
    sample.id = "font-proof";
    // Prove the font renders the peso sign, minus sign, punctuation, and digits
    // at every UI weight, using Lora plus the bundled peso-only fallback.
    for (const weight of [400, 500, 600, 700]) {
      const line = document.createElement("span");
      line.id = `font-proof-${weight}`;
      line.textContent = "Pomi’s savings · −₱1,000.00 — café ā";
      line.style.cssText = `display:block;font: ${weight} 16px var(--serif)`;
      sample.append(line);
    }
    document.body.append(sample);
    await Promise.all(
      [400, 500, 600, 700].flatMap((weight) => [
        document.fonts.load(`${weight} 16px Lora`, sample.textContent!),
        document.fonts.load(`${weight} 16px "Noto Serif Peso"`, "₱"),
      ]),
    );
    await document.fonts.ready;
  });
  const session = await page.context().newCDPSession(page);
  await session.send("DOM.enable");
  await session.send("CSS.enable");
  const { root } = await session.send("DOM.getDocument");
  for (const weight of [400, 500, 600, 700]) {
    const { nodeId } = await session.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `#font-proof-${weight}`,
    });
    const { fonts } = await session.send("CSS.getPlatformFontsForNode", {
      nodeId,
    });
    expect(fonts.map((font) => font.familyName).sort()).toEqual([
      "Lora",
      "Noto Serif",
    ]);
    for (const font of fonts) {
      expect(font.isCustomFont).toBe(true);
      expect(font.glyphCount).toBeGreaterThan(0);
    }
  }
  await session.detach();
  const digitWidths = await page.evaluate(() => {
    const probe = document.createElement("span");
    probe.style.cssText =
      "display:inline-block;font:700 32px Lora;font-variant-numeric:tabular-nums";
    document.body.append(probe);
    const widths = ["111111", "888888"].map((text) => {
      probe.textContent = text;
      return probe.getBoundingClientRect().width;
    });
    probe.remove();
    document.getElementById("font-proof")!.remove();
    return widths;
  });
  expect(digitWidths[0]).toBeCloseTo(digitWidths[1], 1);
}

test("renders bundled Lora glyphs and weights online and after an offline reload", async ({
  page,
  context,
}) => {
  const externalRequests: string[] = [];
  const fontResponses: { url: string; serviceWorker: boolean }[] = [];
  page.on("request", (request) => {
    if (/fonts\.(googleapis|gstatic)\.com/.test(request.url()))
      externalRequests.push(request.url());
  });
  page.on("response", (response) => {
    if (response.url().endsWith(".woff2"))
      fontResponses.push({
        url: response.url(),
        serviceWorker: response.fromServiceWorker(),
      });
  });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await checkLoraGlyphs(page);
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The prompt-style service worker takes control on the next navigation.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  const fontPaths = [
    "/fonts/lora/lora-latin-wght.woff2",
    "/fonts/lora/lora-latin-ext-wght.woff2",
    "/fonts/noto-serif-peso/noto-serif-peso-wght.woff2",
  ];
  for (const path of fontPaths) {
    const cached = await page.evaluate(
      async (path) =>
        (await caches.match(path, { ignoreSearch: true }))?.ok ?? false,
      path,
    );
    expect(cached, `${path} is precached`).toBe(true);
  }
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Network.clearBrowserCache");
  fontResponses.length = 0;
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await checkLoraGlyphs(page);
  for (const path of fontPaths) {
    expect(
      fontResponses.some(
        (response) => response.url.endsWith(path) && response.serviceWorker,
      ),
    ).toBe(true);
  }
  expect(externalRequests).toEqual([]);
  await session.detach();
  await context.setOffline(false);
});
