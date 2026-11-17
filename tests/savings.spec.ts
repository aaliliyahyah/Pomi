import { chooseOption } from "./helpers";
import { expect, test } from "@playwright/test";
import {
  emptyNotebook,
  exportBackup,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
  setNoClass,
  makeEntry,
  withEntry,
} from "../src/model";

// Fixed, flexible, goal-free, and historical balances share the same workspace.
test("shows compact funds, optional goals and actionable daily states without changing savings", async ({
  page,
}) => {
  let book = savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "challenge",
          name: "Challenge",
          archived: false,
          savingMode: "fixed",
          dailyAmount: 5000,
          goal: 50000,
        },
        {
          id: "extra",
          name: "Extra savings",
          archived: false,
          savingMode: "flexible",
          dailyAmount: null,
          goal: 20000,
        },
        {
          id: "bag",
          name: "New bag fund",
          archived: false,
          savingMode: "flexible",
          dailyAmount: null,
          goal: null,
        },
      ],
    },
    {
      id: "school",
      dailyAmount: 20000,
      total: 100000,
      dayCount: 5,
      date: "2026-11-15",
      startDate: "2026-11-16",
      schoolDays: [1, 2, 3, 4, 5],
      note: "School allowance",
    },
  );
  book = setAllowanceDay(book, "school", 1, true);
  book = setSavingsDay(book, "school", 1, "challenge", true);
  book = setAllowanceDay(book, "school", 2, true);
  book = setNoClass(book, "school", 4, true);
  for (const [id, amount] of [
    ["extra", 10000],
    ["bag", 20000],
  ] as const) {
    book = withEntry(
      book,
      makeEntry("opening_savings", amount, { fundId: id }),
    );
  }
  await page.goto("/#settings");
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "savings.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(book)),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await expect(page.locator(".savings-total strong")).toHaveText("₱350.00");
  await expect(page.locator(".savings-funds .fund-card")).toHaveCount(3);
  await expect(page.locator(".savings-funds progress")).toHaveCount(2);
  const panel = page.locator("#fund-checklist-panel");
  await expect(page.locator(".fund-checklist-hint")).toHaveCount(0);
  await expect(panel.getByRole("progressbar")).toHaveAttribute("value", "5000");
  const day1 = panel.getByRole("region", { name: "Day 1", exact: true });
  const day2 = panel.getByRole("region", { name: "Day 2", exact: true });
  const day3 = panel.getByRole("region", { name: "Day 3", exact: true });
  const day4 = panel.getByRole("region", { name: "Day 4", exact: true });
  await expect(day1.getByRole("checkbox")).toBeChecked();
  await expect(day1).toContainText("Saved");
  await expect(day2).toContainText("Pending");
  await expect(day2.getByRole("checkbox")).toBeEnabled();
  await expect(day3.getByRole("checkbox")).toBeDisabled();
  await expect(
    day3.getByText("Check allowance first", { exact: true }),
  ).toHaveCount(0);
  await expect(day3.getByRole("checkbox")).not.toHaveAttribute(
    "aria-describedby",
    /.+/,
  );
  await expect(day4.getByRole("checkbox")).toHaveCount(0);
  await expect(day4).toContainText("No class");
  const statusContrast = await panel
    .locator(".savings-check-status")
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
          state: element.textContent,
          ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
        };
      });
    });
  for (const pair of statusContrast)
    expect(pair.ratio, pair.state ?? "Savings status").toBeGreaterThanOrEqual(
      4.5,
    );
  await day2.getByRole("checkbox").focus();
  await page.keyboard.press("Space");
  await expect(day2.getByRole("checkbox")).toBeChecked();
  await expect(page.locator(".savings-total strong")).toHaveText("₱400.00");
  await expect(panel.getByRole("progressbar")).toHaveAttribute(
    "value",
    "10000",
  );
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`savings-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("button", { name: "View checklist for Extra savings" })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    panel.getByRole("button", { name: "Fund details", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(panel.locator(".fund-details-content")).toBeVisible();
  await expect(panel.getByRole("checkbox")).toHaveCount(0);
  for (const width of [1440, 1024, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`fund-details-${width}.png`),
      fullPage: true,
    });
  }

  await panel
    .getByRole("button", { name: "Fund details", exact: true })
    .click();
  await expect(panel).toContainText("₱200.00");
  await expect(
    panel.getByText("Withdraw, archive, or restore a fund", { exact: false }),
  ).toHaveCount(0);
  await panel.getByRole("button", { name: "Add Savings", exact: true }).click();
  await expect(
    page.getByRole("dialog").getByLabel("Savings fund", { exact: true }),
  ).toContainText("Extra savings");
  await page.keyboard.press("Escape");
  await expect(
    panel.getByRole("button", { name: "Add Savings", exact: true }),
  ).toBeFocused();
  await page
    .getByRole("button", { name: "View checklist for New bag fund" })
    .click();
  await expect(panel.getByRole("progressbar")).toHaveCount(0);
  await panel
    .getByRole("button", { name: "Fund details", exact: true })
    .click();
  await expect(panel).toContainText("No goal set");
  await expect(page.locator(".savings-total strong")).toHaveText("₱400.00");
  // A fixed fund changing to flexible retains its historical checklist.
  await page
    .getByRole("button", { name: "View checklist for Challenge" })
    .click();
  await expect(
    panel.getByRole("button", { name: "Daily checklist", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "Edit fund", exact: true }).click();
  await chooseOption(page.getByLabel("Saving frequency"), "flexible");
  await page.getByRole("button", { name: "Save fund", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Daily checklist", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(day1.getByRole("checkbox")).toBeChecked();
  // Removing checklist eligibility on the selected fund resets its default view.
  await page
    .getByRole("button", { name: "View checklist for New bag fund" })
    .click();
  await panel.getByRole("button", { name: "Edit fund", exact: true }).click();
  await chooseOption(page.getByLabel("Saving frequency"), "fixed");
  await page.getByLabel("Daily savings amount").fill("25");
  await page.getByRole("button", { name: "Save fund", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Daily checklist", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await panel.getByRole("button", { name: "Edit fund", exact: true }).click();
  await chooseOption(page.getByLabel("Saving frequency"), "flexible");
  await page.getByRole("button", { name: "Save fund", exact: true }).click();
  await expect(
    panel.getByRole("button", { name: "Fund details", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});
