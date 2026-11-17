import { expect, test } from "@playwright/test";
import { chooseOption, menuAction } from "./helpers";
import {
  emptyNotebook,
  exportBackup,
  makeEntry,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
  withEntry,
} from "../src/model";

test("browses grouped history, filters and totals while preserving edits and withdrawals", async ({
  page,
}) => {
  let book = savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "savings",
          name: "Challenge",
          savingMode: "fixed",
          dailyAmount: 5000,
          goal: 50000,
          archived: false,
        },
      ],
    },
    {
      id: "school",
      total: 100000,
      dailyAmount: 20000,
      dayCount: 5,
      date: "2026-11-15",
      startDate: "2026-11-16",
      schoolDays: [1, 2, 3, 4, 5],
      note: "School allowance",
    },
  );
  book = setSavingsDay(
    setAllowanceDay(book, "school", 1, true),
    "school",
    1,
    "savings",
    true,
  );
  for (const [note, amount, date] of [
    ["Food", 5400, "2026-11-16"],
    ["Transportation", 2500, "2026-11-15"],
    ["School supplies", 15000, "2026-11-15"],
  ] as const)
    book = withEntry(book, makeEntry("expense", amount, { note, date }));
  for (const [kind, amount, note, date] of [
    ["opening_savings", 10000, "Starting savings", "2026-11-14"],
    ["return", 2000, "Returned for lunch", "2026-11-16"],
    ["spend", 1000, "Fund purchase", "2026-11-15"],
  ] as const)
    book = withEntry(
      book,
      makeEntry(kind, amount, { fundId: "savings", note, date }),
    );
  await page.goto("/#settings");
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "history.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(book)),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  const rows = page.locator(".history-panel .entry-row");
  await expect(rows).toHaveCount(8);
  await expect(page.locator(".history-summary strong")).toHaveText([
    "₱1,000.00",
    "₱229.00",
    "₱50.00",
    "₱30.00",
  ]);
  await expect(
    page.getByRole("heading", { name: "Transactions (7)", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".history-date-heading time")).toHaveText([
    "Mon, Nov 16, 2026",
    "Sun, Nov 15, 2026",
  ]);
  await expect(page.locator(".starting-balances .entry-row")).toHaveCount(1);
  await expect(
    rows
      .filter({ hasText: "Returned for lunch" })
      .locator(".entry-end > strong"),
  ).toHaveText("−₱20.00");
  const kindContrast = await rows
    .locator(".history-entry-kind")
    .evaluateAll((elements) => {
      function luminance(value: string) {
        const [r, g, b] = value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((channel) => {
            const normalized = channel / 255;
            return normalized <= 0.04045
              ? normalized / 12.92
              : ((normalized + 0.055) / 1.055) ** 2.4;
          });
        return r * 0.2126 + g * 0.7152 + b * 0.0722;
      }
      return elements.map((element) => {
        const style = getComputedStyle(element);
        const fg = luminance(style.color),
          bg = luminance(style.backgroundColor);
        return {
          kind: element.textContent,
          ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
        };
      });
    });
  for (const pair of kindContrast)
    expect(pair.ratio, pair.kind ?? "Transaction kind").toBeGreaterThanOrEqual(
      4.5,
    );
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const amountHeights = await rows
      .locator(".entry-end > strong")
      .evaluateAll((elements) =>
        elements.map((element) => element.getBoundingClientRect().height),
      );
    expect(amountHeights.every((height) => height <= 24)).toBe(true);
    const row = rows.filter({ hasText: "Food" });
    await row.locator("summary").click();
    const popup = row.locator(".action-popover");
    await expect(popup).toBeVisible();
    const bounds = await popup.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width);
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000);
    await page.screenshot({
      path: test.info().outputPath(`history-${width}.png`),
      fullPage: true,
    });
    await page.keyboard.press("Escape");
    await expect(row.locator("summary")).toBeFocused();
    await expect(popup).not.toBeVisible();
  }
  await chooseOption(page.getByLabel("Entry type", { exact: true }), "expense");
  await expect(rows).toHaveCount(3);
  await expect(page.locator(".history-summary strong")).toHaveText([
    "₱0.00",
    "₱229.00",
    "₱0.00",
    "₱0.00",
  ]);
  await page.getByLabel("From", { exact: true }).fill("2026-11-16");
  await expect(rows).toHaveCount(1);
  await page.screenshot({
    path: test.info().outputPath("history-filtered-320.png"),
    fullPage: true,
  });
  await expect(page.locator(".history-summary strong").nth(1)).toHaveText(
    "₱54.00",
  );
  await expect(
    page.locator(
      ".history-active-filters, .history-filter-chip, .history-scope, .history-day-count",
    ),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Clear all", exact: true }),
  ).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("");
  await expect(page.getByLabel("From", { exact: true })).toBeFocused();
  await expect(rows).toHaveCount(3);
  await chooseOption(page.getByLabel("Entry type", { exact: true }), "");
  await expect(page.getByLabel("Entry type", { exact: true })).toBeFocused();
  await chooseOption(page.getByLabel("Sort by", { exact: true }), "oldest");
  await expect(page.locator(".history-date-heading time")).toHaveText([
    "Sun, Nov 15, 2026",
    "Mon, Nov 16, 2026",
  ]);
  await chooseOption(page.getByLabel("Fund", { exact: true }), "savings");
  await expect(rows).toHaveCount(4);
  await page.getByLabel("From", { exact: true }).fill("2099-01-01");
  await expect(
    page.getByRole("heading", { name: "No matching entries", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: test.info().outputPath("history-empty-filter-320.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.getByLabel("Fund", { exact: true })).toBeFocused();
  await expect(rows).toHaveCount(8);
  await menuAction(page, "Edit Food");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("55");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.locator(".history-summary strong").nth(1)).toHaveText(
    "₱230.00",
  );
  page.once("dialog", (dialog) => dialog.dismiss());
  await menuAction(page, "Delete School supplies");
  await expect(rows).toHaveCount(8);
  page.once("dialog", (dialog) => dialog.accept());
  await menuAction(page, "Delete School supplies");
  await expect(rows).toHaveCount(7);
  await expect(page.locator("#history-transactions-title")).toBeFocused();
  await expect(page.locator(".history-summary strong").nth(1)).toHaveText(
    "₱80.00",
  );
  await expect(page.locator(".history-add-menu")).toHaveCount(0);
  const layout = await page.locator(".history-page").evaluate((page) => {
    const totals = page.querySelector(".history-summary")!;
    const filters = page.querySelector(".history-filters")!;
    return {
      totalsBeforeFilters: !!(
        totals.compareDocumentPosition(filters) &
        Node.DOCUMENT_POSITION_FOLLOWING
      ),
      border: getComputedStyle(filters).borderTopWidth,
    };
  });
  expect(layout).toEqual({ totalsBeforeFilters: true, border: "0px" });
  await page.reload();
  await expect(page.locator(".history-summary strong").nth(1)).toHaveText(
    "₱80.00",
  );
});

test("explains an empty history and invalid dates with keyboard recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 900 });
  await page.goto("/#settings");
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "empty-history.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      exportBackup({ ...emptyNotebook(), initialized: true }),
    ),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No transactions yet", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".history-summary strong")).toHaveText([
    "₱0.00",
    "₱0.00",
    "₱0.00",
    "₱0.00",
  ]);
  await page.screenshot({
    path: test.info().outputPath("history-empty-320.png"),
    fullPage: true,
  });
  await expect(page.locator(".history-add-menu")).toHaveCount(0);
  await page.getByLabel("From", { exact: true }).fill("2026-11-17");
  await page.getByLabel("To", { exact: true }).fill("2026-11-16");
  await expect(page.getByRole("alert")).toContainText(
    "Choose an end date on or after the start date",
  );
  await expect(page.getByLabel("To", { exact: true })).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await page.getByRole("button", { name: "Clear all", exact: true }).click();
  await expect(page.getByLabel("Fund", { exact: true })).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "No transactions yet", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".history-active-filters")).toHaveCount(0);
});
