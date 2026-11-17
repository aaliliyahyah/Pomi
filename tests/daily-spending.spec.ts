import { expect, test } from "@playwright/test";
import {
  selectExpenseDay,
  configureSavings,
  menuAction,
  openAllowanceForm,
} from "./helpers";
import {
  emptyNotebook,
  makeEntry,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
  withEntry,
} from "../src/model";

async function addPeriod(page: import("@playwright/test").Page) {
  await openAllowanceForm(page);
  await page.getByLabel("Total allowance given").fill("1000");
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Number of days").fill("3");
  await page.getByLabel("School start date").fill("2026-11-16");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}

test("tracks a daily budget and confirms overspending without losing cancelled input", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T12:00:00") });
  await page.goto("/");
  await configureSavings(page);
  await addPeriod(page);
  const day1 = page.getByRole("region", { name: "Day 1", exact: true });
  await day1.getByRole("checkbox", { name: /^Day 1 allowance/ }).check();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱1,000.00");
  await day1.getByRole("checkbox", { name: /^Day 1 My savings/ }).check();
  await expect(
    day1.getByRole("button", { name: "Record expense", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await page
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Allowance day", { exact: true }),
  ).toContainText("Day 1");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("25");
  await page.getByRole("dialog").getByLabel("Note").fill("Lunch");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(
    day1.locator(".day-spent, .day-balance, .day-status"),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱25.00");
  await expect(page.getByTestId("expenses-remaining")).toHaveText("₱925.00");
  await expect(page.getByTestId("daily-remaining")).toHaveText("₱125.00");
  await expect(page.locator(".daily-budget-breakdown > span")).toHaveCount(2);
  await expect(
    page.getByRole("region", { name: "Total spent", exact: true }),
  ).not.toContainText("All time");
  await selectExpenseDay(page, 2);
  await expect(page.getByTestId("daily-remaining")).toHaveText("—");
  await page.getByRole("button", { name: "Start day in Allowance" }).click();
  const day2 = page.getByRole("region", { name: "Day 2", exact: true });
  await expect(day2).toBeFocused();
  await day2.getByRole("checkbox", { name: /^Day 2 allowance/ }).check();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await selectExpenseDay(page, 2);
  await page
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Allowance day", { exact: true }),
  ).toContainText("Day 2");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("250");
  await page.getByRole("dialog").getByLabel("Note").fill("School supplies");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  const budgetDialog = page.getByRole("dialog", {
    name: "Record over budget?",
  });
  await expect(budgetDialog).toContainText("Day 2");
  await budgetDialog.getByRole("button", { name: "Cancel" }).click();
  await expect(
    page
      .getByRole("dialog", { name: "Expense" })
      .getByRole("spinbutton", { name: "Amount", exact: true }),
  ).toHaveValue("250");
  await expect(page.getByTestId("daily-remaining")).toHaveText("₱200.00");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page
    .getByRole("dialog", { name: "Record over budget?" })
    .getByRole("button", { name: "Record anyway" })
    .click();
  await expect(page.getByRole("dialog", { name: "Expense" })).not.toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Record over budget?" }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(
    day2.locator(".day-spent, .day-balance, .day-status"),
  ).toHaveCount(0);
  await expect(day2.getByText("How to skip", { exact: true })).toHaveCount(0);
  await expect(
    day2.getByRole("button", { name: "Record expense", exact: true }),
  ).toHaveCount(0);
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`allowance-clean-${width}.png`),
      fullPage: true,
    });
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(
    day2.getByRole("button", { name: "Mark no class" }),
  ).toBeDisabled();
  await day2.getByRole("checkbox", { name: /^Day 2 allowance/ }).click();
  await expect(day2.getByRole("alert")).toContainText("reassign");
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await selectExpenseDay(page, 2);
  await expect(page.getByTestId("daily-remaining")).toHaveText("-₱50.00");
  await page.reload();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱275.00");
  await expect(page.getByTestId("expenses-remaining")).toHaveText("₱675.00");
});

test("restores historical checked days without changing balances and starts new days with actual accounting", async ({
  page,
}) => {
  const base = savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "fund",
          name: "My savings",
          goal: null,
          archived: false,
          savingMode: "fixed",
          dailyAmount: 5000,
        },
      ],
    },
    {
      id: "school",
      dailyAmount: 20000,
      total: 100000,
      dayCount: 3,
      date: "2026-11-15",
      startDate: "2026-11-16",
      schoolDays: [1, 2, 3, 4, 5],
      note: "School allowance",
    },
  );
  base.periods[0].days[0].accounting = "legacy";
  const checked = withEntry(
    setSavingsDay(
      setAllowanceDay(base, "school", 1, true),
      "school",
      1,
      "fund",
      true,
    ),
    makeEntry("expense", 2500, {
      allowancePeriodId: "school",
      note: "Old lunch",
    }),
  );
  const legacy = {
    ...checked,
    version: 3,
    periods: checked.periods.map((period) => ({
      ...period,
      startDate: undefined,
      days: period.days.map(({ accounting: _, date: __, ...day }) => day),
    })),
  };
  await page.goto("/#settings");
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "historical.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        app: "pomi",
        version: 3,
        exportedAt: new Date().toISOString(),
        notebook: legacy,
      }),
    ),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱175.00");
  await expect(page.getByTestId("expenses-remaining")).toHaveText("₱775.00");
  await expect(page.getByText("Earlier record", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(page.locator(".schedule-cue")).toHaveCount(0);
  await expect(
    page.getByText("Dates were inferred", { exact: false }),
  ).toHaveCount(0);
  const day1 = page.getByRole("region", { name: "Day 1", exact: true });
  await expect(day1.locator(".day-balance")).toHaveCount(0);
  await expect(day1.getByText("Earlier record", { exact: true })).toHaveCount(
    0,
  );
  await expect(day1.locator(".day-spent")).toHaveCount(0);
  await menuAction(page, "Edit period");
  await expect(page.getByRole("dialog")).toContainText("Dates were inferred");
  await page.keyboard.press("Escape");
  const day2 = page.getByRole("region", { name: "Day 2", exact: true });
  await day2.getByRole("checkbox", { name: /^Day 2 allowance/ }).check();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱775.00");
  await day2.getByRole("checkbox", { name: /^Day 2 My savings/ }).check();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱725.00");
  await page.getByRole("link", { name: "History", exact: true }).click();
  await menuAction(page, "Edit Day 1 allowance");
  await expect(day1).toBeFocused();
});

test("collapses the sidebar, preserves keyboard routes and leaves mobile navigation visible", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await expect(page.locator(".sidebar")).toHaveCSS("width", "80px");
  await expect(page.locator(".workspace")).toHaveCSS("margin-left", "80px");
  const history = page.getByRole("link", { name: "History", exact: true });
  await history.focus();
  await expect(page.getByRole("tooltip")).toHaveText("History");
  await page.keyboard.press("Enter");
  await expect(page).toHaveTitle("History · Pomi");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.reload();
  await expect(page.locator(".sidebar")).toHaveCSS("width", "80px");
  await page.getByRole("button", { name: "Expand sidebar" }).click();
  await expect(page.locator(".sidebar")).toHaveCSS("width", "232px");
  await page.getByRole("button", { name: "Collapse sidebar" }).click();
  await page.setViewportSize({ width: 320, height: 720 });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveCount(5);
  await expect(
    page.getByRole("link", { name: "Expenses", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Expand sidebar" }),
  ).toHaveCount(0);
  await expect(page.locator(".workspace")).toHaveCSS("margin-left", "0px");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
