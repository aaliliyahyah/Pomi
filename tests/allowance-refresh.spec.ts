import { expect, test } from "@playwright/test";
import {
  emptyNotebook,
  exportBackup,
  makeEntry,
  savePeriod,
  setAllowanceDay,
} from "../src/model";
for (const width of [1440, 320])
  test(`allowance and selected fund refresh at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    let book = savePeriod(
      {
        ...emptyNotebook(),
        initialized: true,
        funds: [
          {
            id: "a",
            name: "Challenge",
            archived: false,
            savingMode: "fixed",
            dailyAmount: 5000,
            goal: 150000,
          },
          {
            id: "b",
            name: "Travel",
            archived: false,
            savingMode: "flexible",
            goal: 200000,
          },
        ],
        entries: [
          makeEntry("opening_savings", 5000, { fundId: "a" }),
          makeEntry("opening_savings", 2000, { fundId: "b" }),
        ],
      },
      {
        id: "p",
        total: 100000,
        dailyAmount: 20000,
        dayCount: 5,
        date: "2026-11-16",
        note: "School",
      },
    );
    book = setAllowanceDay(book, "p", 1, true);
    await page.goto("/#settings");
    await page.getByLabel("Choose Pomi backup").setInputFiles({
      name: "refresh.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportBackup(book)),
    });
    await page.getByRole("button", { name: "Replace and restore" }).click();
    await page.getByRole("link", { name: "Allowance", exact: true }).click();
    await expect(page.getByTestId("given-allowance")).toHaveText("₱1,000.00");
    await expect(page.getByTestId("allowance-balance")).toHaveText("₱800.00");
    await expect(page.locator(".savings-cell")).toHaveCount(0);
    await page
      .locator(".checkin-day")
      .nth(1)
      .getByRole("button", { name: "Mark no class" })
      .click();
    await expect(page.getByTestId("allowance-balance")).toHaveText("₱600.00");
    await expect(page.locator(".allowance-spent .summary-amount")).toHaveText(
      "₱200.00",
    );
    await page.getByRole("link", { name: "Expenses", exact: true }).click();
    await expect(
      page.locator('.expense-day-toggle[aria-expanded="true"]'),
    ).toHaveCount(0);
    await page.locator(".expense-day-toggle").first().click();
    await expect(
      page.locator('.expense-day-toggle[aria-expanded="true"]'),
    ).toHaveCount(1);
    await page.getByRole("link", { name: "Savings", exact: true }).click();
    await expect(page.locator(".savings-total .summary-amount")).toHaveText(
      "₱50.00",
    );
    const panel = page.getByTestId("selected-fund-panel");
    await expect(panel.locator("progress")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Fund details", exact: true })
      .click();
    await expect(
      page.getByRole("table", { name: "Fund details" }),
    ).toContainText("Fixed daily");
    await page.getByRole("combobox", { name: "Savings fund" }).click();
    await page.getByRole("option", { name: "Travel", exact: true }).click();
    await expect(page.locator(".savings-total .summary-amount")).toHaveText(
      "₱20.00",
    );
    await expect(
      page.getByRole("progressbar", { name: "Travel goal progress" }),
    ).toHaveAttribute("value", "2000");
    await page.screenshot({
      path: test.info().outputPath(`savings-${width}.png`),
      fullPage: true,
    });
    await expect
      .poll(() =>
        page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
      )
      .toBe(true);
    await page
      .getByRole("button", { name: "Fund details", exact: true })
      .focus();
    await expect(
      page.getByRole("button", { name: "Fund details", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Tab");
    for (const route of ["Allowance", "Expenses", "Home"]) {
      await page.getByRole("link", { name: route, exact: true }).click();
      await page.screenshot({
        path: test.info().outputPath(`${route}-${width}.png`),
        fullPage: true,
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.locator("html").evaluate((el) => {
        el.style.fontSize = "200%";
      });
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        )
        .toBe(true);
      await page.locator("html").evaluate((el) => {
        el.style.fontSize = "";
      });
    }
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page.locator(".balance-grid > section")).toHaveCount(1);
    await expect(
      page.getByRole("button", { name: "Record expense", exact: true }),
    ).toBeVisible();
  });
