import { expect, test, type Page } from "@playwright/test";

async function setup(page: Page) {
  await page.goto("/");
  await page.getByLabel("My available allowance").fill("1000");
  await page.getByLabel("My first savings fund").fill("Rainy day");
  await page.getByLabel("Already saved in this fund").fill("100");
  await page.getByRole("button", { name: "Open my notebook" }).click();
  await expect(
    page.getByRole("heading", { name: "My money, at a glance." }),
  ).toBeVisible();
}
async function saveEntry(page: Page, amount: string, note: string) {
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill(amount);
  await page.getByRole("dialog").getByLabel("Note").fill(note);
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("records, corrects, backs up, restores, and opens offline", async ({
  page,
  context,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await setup(page);
  await expect(page.locator(".hero-balance").first()).toHaveText("₱1,000.00");
  await page
    .getByRole("button", { name: "Add allowance", exact: true })
    .click();
  await saveEntry(page, "500", "Weekly allowance");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await saveEntry(page, "50", "Lunch");
  await expect(page.locator(".hero-balance").first()).toHaveText("₱1,450.00");
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await page.getByRole("button", { name: "Add savings", exact: true }).click();
  await saveEntry(page, "200", "Put aside");
  await expect(page.locator(".fund-value")).toHaveText("₱300.00");
  await page.getByRole("button", { name: "Add savings", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Where is this money from?")
    .selectOption("extra");
  await saveEntry(page, "100", "Birthday gift");
  await page.getByRole("button", { name: "Take out", exact: true }).click();
  await saveEntry(page, "50", "Back to wallet");
  await page.getByRole("button", { name: "Take out", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByLabel("Where is this money going?")
    .selectOption("spend");
  await saveEntry(page, "25", "Book from savings");
  await expect(page.locator(".fund-value")).toHaveText("₱325.00");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-balance").first()).toHaveText("₱1,300.00");
  await page.getByRole("link", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "Edit Lunch", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("75");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Delete Weekly allowance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Delete Weekly allowance", exact: true }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-balance").first()).toHaveText("₱775.00");
  await page.reload();
  await expect(page.locator(".hero-balance").first()).toHaveText("₱775.00");
  await page.screenshot({
    path: test.info().outputPath("pomi-desktop.png"),
    fullPage: true,
  });

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const download = await downloadPromise;
  const backupPath = test.info().outputPath("backup.json");
  await download.saveAs(backupPath);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await saveEntry(page, "10", "After backup");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Choose Pomi backup").setInputFiles(backupPath);
  await expect(page.getByRole("dialog")).toContainText("Replace my notebook?");
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".hero-balance").first()).toHaveText("₱775.00");

  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".hero-balance").first()).toHaveText("₱775.00");
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  await saveEntry(page, "5", "Offline snack");
  await page.reload();
  await expect(page.locator(".hero-balance").first()).toHaveText("₱770.00");
  await context.setOffline(false);
  expect(errors).toEqual([]);
});

test("warns about negative allowance, blocks excessive withdrawals, validates backups", async ({
  page,
}) => {
  await setup(page);
  await page.getByRole("button", { name: "Add expense", exact: true }).click();
  page.once("dialog", (dialog) => dialog.dismiss());
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("1500");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".hero-balance").first()).toHaveText("-₱500.00");
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await page.getByRole("button", { name: "Take out", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("101");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("below zero");
  await page.getByRole("button", { name: "Close dialog" }).click();
  await expect(page.locator(".fund-value")).toHaveText("₱100.00");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "invalid.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole("alert")).toContainText(
    "not a supported Pomi backup",
  );
});

test("creates goals, archives funds, edits starting balances and fits mobile screens", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await page.getByRole("button", { name: "New fund", exact: true }).click();
  await page.getByLabel("Fund name", { exact: true }).fill("New phone");
  await page.getByLabel("Goal amount").fill("1000");
  await page
    .getByRole("spinbutton", { name: "Already saved", exact: true })
    .fill("250");
  await page.getByRole("button", { name: "Create fund" }).click();
  const phone = page.getByRole("article").filter({
    has: page.getByRole("heading", { name: "New phone", exact: true }),
  });
  await expect(phone.getByRole("progressbar")).toHaveAttribute(
    "aria-valuenow",
    "25",
  );
  await phone
    .getByRole("button", { name: "Archive fund", exact: true })
    .click();
  await expect(phone).not.toBeVisible();
  await page.getByLabel("Show archived").check();
  await expect(phone).toBeVisible();
  await expect(page.locator(".savings-overview strong")).toHaveText("₱350.00");
  await phone
    .getByRole("button", { name: "Restore fund", exact: true })
    .click();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Fund", exact: true })
    .selectOption({ label: "New phone" });
  await page
    .getByRole("button", { name: "Edit Starting savings", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("300");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(page.locator(".entry-end strong")).toHaveText("+₱300.00");
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator(".savings-summary .hero-balance")).toHaveText(
    "₱400.00",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath("pomi-mobile.png"),
    fullPage: true,
  });
});
