import { readFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

async function expectReadableError(alert: Locator) {
  const ratio = await alert.evaluate((element) => {
    const style = getComputedStyle(element);
    function luminance(color: string) {
      const rgb = color
        .match(/[\d.]+/g)!
        .slice(0, 3)
        .map(Number)
        .map((v) => {
          const channel = v / 255;
          return channel <= 0.04045
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4;
        });
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    const foreground = luminance(style.color);
    const background = luminance(style.backgroundColor);
    return (
      (Math.max(foreground, background) + 0.05) /
      (Math.min(foreground, background) + 0.05)
    );
  });
  expect(ratio).toBeGreaterThanOrEqual(4.5);
}

async function settings(page: Page) {
  await page.goto("/");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
}

async function backup(page: Page) {
  const downloaded = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const path = await (await downloaded).path();
  return {
    name: "backup.json",
    mimeType: "application/json",
    buffer: await readFile(path!),
  };
}

for (const width of [1440, 320]) {
  test(`restore failure stays in the dialog and supports retry at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await settings(page);
    const file = await backup(page);
    const replacement = JSON.parse(file.buffer.toString());
    replacement.notebook.entries.find(
      (entry: { kind: string }) => entry.kind === "opening_allowance",
    ).amount = 12345;
    file.buffer = Buffer.from(JSON.stringify(replacement));
    await expect(page.getByRole("status")).toContainText(
      "Backup download started",
    );
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (
        ...args: Parameters<typeof original>
      ) {
        if (this.name === "notebooks")
          throw new Error("Unable to restore. Try again.");
        return original.apply(this, args);
      };
      Object.assign(window, {
        restorePut: () => {
          IDBObjectStore.prototype.put = original;
        },
      });
    });
    const trigger = page.getByRole("button", {
      name: "Restore backup",
      exact: true,
    });
    await trigger.focus();
    await page.getByLabel("Choose Pomi backup").setInputFiles(file);
    const dialog = page.getByRole("dialog");
    const replace = dialog.getByRole("button", { name: "Replace and restore" });
    await replace.click();
    await expect(dialog.getByRole("alert")).toContainText("Try again");
    await expect(replace).toBeEnabled();
    await expectReadableError(dialog.getByRole("alert"));
    await expect(page.locator(".settings-panel [role=alert]")).toHaveCount(0);
    await page.screenshot({
      path: test.info().outputPath(`restore-error-${width}.png`),
      fullPage: true,
    });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await dialog.getByRole("button", { name: "Keep my notebook" }).click();
    await expect(trigger).toBeFocused();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.locator(".hero-balance").first()).toHaveText("₱0.00");
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    await trigger.focus();
    await page.getByLabel("Choose Pomi backup").setInputFiles(file);
    await expect(dialog.getByRole("alert")).toHaveCount(0);
    await replace.click();
    await expect(dialog.getByRole("alert")).toBeVisible();
    await page.evaluate(() =>
      (window as unknown as { restorePut(): void }).restorePut(),
    );
    await replace.click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole("status")).toContainText(
      "Your backup has been restored",
    );
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.locator(".hero-balance").first()).toHaveText("₱123.45");
  });
}

test("invalid backup feedback clears on new selection and export", async ({
  page,
}) => {
  await settings(page);
  const file = await backup(page);
  const input = page.getByLabel("Choose Pomi backup");
  await input.setInputFiles({
    name: "bad.json",
    mimeType: "application/json",
    buffer: Buffer.from("invalid"),
  });
  const panel = page.locator("section").filter({
    has: page.getByRole("heading", {
      name: "Backup and restore",
      exact: true,
    }),
  });
  await expect(panel.getByRole("alert")).toBeVisible();
  await input.setInputFiles(file);
  await expect(panel.getByRole("alert")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await input.setInputFiles({
    name: "large.json",
    mimeType: "application/json",
    buffer: Buffer.alloc(20_000_001),
  });
  await expect(panel.getByRole("alert")).toHaveText(
    "Choose a backup smaller than 20 MB.",
  );
  await backup(page);
  await expect(panel.getByRole("alert")).toHaveCount(0);
});

test("installation failures stay in Install Pomi and cancellation clears them", async ({
  page,
}) => {
  await settings(page);
  await page.evaluate(() => {
    let attempts = 0;
    const event = new Event("beforeinstallprompt", { cancelable: true });
    Object.assign(event, {
      prompt: async () => {
        if (++attempts === 1) throw new Error("Unable to install. Try again.");
      },
      userChoice: Promise.resolve({ outcome: "dismissed" }),
    });
    dispatchEvent(event);
  });
  const panel = page.locator("section").filter({
    has: page.getByRole("heading", { name: "Install Pomi", exact: true }),
  });
  await panel
    .getByRole("button", { name: "Install Pomi", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toHaveText(
    "Unable to install. Try again.",
  );
  await expect(page.getByRole("alert")).toHaveCount(1);
  await expectReadableError(panel.getByRole("alert"));
  await page.setViewportSize({ width: 320, height: 900 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await panel.getByRole("alert").scrollIntoViewIfNeeded();
  await page.screenshot({
    path: test.info().outputPath("install-error-enlarged-320.png"),
    fullPage: true,
  });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await panel
    .getByRole("button", { name: "Install Pomi", exact: true })
    .click();
  await expect(page.getByRole("alert")).toHaveCount(0);
});
