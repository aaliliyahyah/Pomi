import { expect, test, type Page } from "@playwright/test";
import { emptyNotebook, savePeriod, exportBackup } from "../src/model";
async function setup(page: Page) {
  const book = savePeriod(
    { ...emptyNotebook(), initialized: true },
    {
      id: "school",
      dailyAmount: 20000,
      total: 100000,
      dayCount: 3,
      date: "2026-11-17",
      note: "School and training allowance",
    },
  );
  await page.goto("/#settings");
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "header.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(book)),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
}
for (const route of ["Allowance", "Expenses"])
  test(`expands ${route} action without moving period controls`, async ({
    page,
  }) => {
    await setup(page);
    await page.getByRole("link", { name: route, exact: true }).click();
    const name = route === "Allowance" ? "Add allowance" : "Record expense",
      button = page.getByRole("button", { name, exact: true }),
      field = page.locator(".header-period-row");
    await expect(button).toHaveCSS("width", "176px");
    const collapsed = await button.evaluate(
      (el) => getComputedStyle(el).clipPath,
    );
    const before = (await field.boundingBox())!,
      action = (await button.boundingBox())!;
    expect(
      Math.abs(before.y + before.height / 2 - action.y - action.height / 2),
    ).toBeLessThan(2);
    const menu = (await field.locator("summary").boundingBox())!;
    expect(menu.x + menu.width).toBeLessThanOrEqual(before.x + before.width);
    const icon = (await button.locator("svg").boundingBox())!;
    expect(
      Math.abs(icon.x + icon.width / 2 - action.x - action.width + 24),
    ).toBeLessThan(2);
    await page.mouse.click(action.x + 8, action.y + 24);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath(`${route}-before.png`),
    });
    await button.hover({ position: { x: 160, y: 24 } });
    await page.waitForTimeout(50);
    await page.screenshot({
      path: test.info().outputPath(`${route}-middle.png`),
    });
    await expect(button).toHaveCSS("width", "176px");
    await expect(field).toHaveJSProperty(
      "offsetWidth",
      Math.round(before.width),
    );
    const after = (await field.boundingBox())!;
    expect(after).toEqual(before);
    await page.screenshot({
      path: test.info().outputPath(`${route}-expanded.png`),
    });
    await page.mouse.move(0, 0);
    await expect(button).toHaveCSS("clip-path", collapsed);
    await page.keyboard.press("Tab");
    await button.focus();
    await expect(button).toHaveCSS("width", "176px");
    await button.press("Enter");
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(button).toBeFocused();
    await page.locator("h1").click();
    await page.mouse.move(0, 0);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await button.hover({ position: { x: 160, y: 24 } });
    await expect(button).toHaveCSS("width", "176px");
    await expect(button).toHaveCSS("transition-duration", "0s");
    await page.screenshot({
      path: test.info().outputPath(`${route}-reduced.png`),
    });
  });
for (const route of ["Allowance", "Expenses"])
  test(`keeps ${route} touch action labeled on the same row`, async ({
    browser,
  }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:4173",
      viewport: { width: 320, height: 900 },
      hasTouch: true,
      isMobile: true,
    });
    const page = await context.newPage();
    await setup(page);
    await page.getByRole("link", { name: route, exact: true }).click();
    const button = page.getByRole("button", {
      name: route === "Allowance" ? "Add allowance" : "Record expense",
      exact: true,
    });
    await expect(button).toHaveCSS("width", "120px");
    await expect(button.locator("span")).toHaveCSS("opacity", "1");
    const selector = page.getByRole("combobox", {
      name: "Allowance period",
      exact: true,
    });
    expect(
      (await page.locator(".header-period-row").boundingBox())!.height,
    ).toBeLessThanOrEqual(52);
    await selector.click();
    await expect(
      page.getByRole("option", {
        name: "School and training allowance",
        exact: true,
      }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    const label = button.locator("span");
    const textMetrics = await label.evaluate((el) => ({
      height: el.getBoundingClientRect().height,
      scroll: el.scrollHeight,
      client: el.clientHeight,
      color: getComputedStyle(el).color,
    }));
    expect(textMetrics.scroll).toBeLessThanOrEqual(textMetrics.client);
    expect(textMetrics.height).toBeLessThanOrEqual(38);
    await expect(button).toHaveCSS("transition-duration", "0s");
    const field = (await page.locator(".header-period-row").boundingBox())!,
      box = (await button.boundingBox())!;
    expect(
      Math.abs(field.y + field.height / 2 - box.y - box.height / 2),
    ).toBeLessThan(2);
    expect(box.x).toBeGreaterThan(field.x + field.width);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.waitForTimeout(250);
    await page.screenshot({
      path: test.info().outputPath(`${route}-touch.png`),
      fullPage: false,
      animations: "disabled",
    });
    await button.tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    await context.close();
  });
