import {
  emptyNotebook,
  exportBackup,
  makeEntry,
  savePeriod,
  setAllowanceDay,
  setNoClass,
  setSavingsDay,
  withEntry,
} from "../src/model";
import { expect, test } from "@playwright/test";
import {
  chooseOption,
  selectExpenseDay,
  configureSavings,
  menuAction,
  openAllowanceForm,
} from "./helpers";

test("opens Expenses directly and restores the recording action's keyboard focus", async ({
  page,
}) => {
  await page.goto("/#expenses");
  await expect(page).toHaveTitle("Expenses · Pomi");
  await expect(page.getByTestId("expenses-total")).toHaveText("₱0.00");
  await expect(
    page.getByRole("heading", { name: "No expenses yet" }),
  ).toBeVisible();
  const records = page.getByRole("region", {
    name: "Expense records",
    exact: true,
  });
  const record = records.getByRole("button", {
    name: "Record expense",
    exact: true,
  });
  await expect(record).toHaveCount(1);
  await expect(page.getByRole("group", { name: "Expense view" })).toHaveCount(
    0,
  );
  await expect(records).toBeVisible();
  await record.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(record).toBeFocused();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Add allowance", exact: true }),
  ).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Available allowance", exact: true })
      .getByRole("button", { name: "Add allowance", exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId("home-expenses-total")).toHaveText("₱0.00");
  const summaryColumn = await page.locator(".dashboard-funds").boundingBox();
  const activity = await page.locator(".recent-panel").boundingBox();
  if (
    summaryColumn &&
    activity &&
    (await page.evaluate(() => innerWidth)) > 1100
  ) {
    expect(summaryColumn.x).toBeLessThan(activity.x);
  }
  await expect(
    page
      .getByRole("region", { name: "Expenses summary" })
      .getByRole("button", { name: "Record expense", exact: true }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Record expense", exact: true }),
  ).toHaveCount(0);

  await page.setViewportSize({ width: 320, height: 720 });
  await expect(
    page.getByRole("navigation", { name: "Main navigation" }).getByRole("link"),
  ).toHaveCount(5);
  await page.getByRole("link", { name: "Settings", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveTitle("Settings · Pomi");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect(page.locator(".page-footer, .connection")).toHaveCount(0);
  await expect(page.locator(".save-message")).toHaveText("");
});

test("tracks actual daily expenses, edits and deletes without counting savings", async ({
  page,
}) => {
  await page.goto("/");
  await configureSavings(page);
  await openAllowanceForm(page);
  await page.getByLabel("Total allowance given").fill("1000");
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Number of days").fill("3");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /^Day 1 allowance/ }).check();
  await page.getByRole("checkbox", { name: /^Day 1 My savings/ }).check();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱0.00");
  await expect(page.getByTestId("expenses-remaining")).toHaveText("₱950.00");
  await expect(page.locator(".daily-budget-breakdown > span")).toHaveCount(4);
  const toggle = page.locator(".expense-day.is-selected .expense-day-toggle");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".expense-day-body")).toHaveCount(0);
  const closedToggle = page.locator(".expense-day-toggle").first();
  await expect(closedToggle).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Space");
  await expect(closedToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".expense-day-body")).toHaveCount(1);

  await closedToggle.click();
  await expect(page.locator(".expense-day-body")).toHaveCount(0);
  await expect(page.getByTestId("expenses-remaining")).toHaveText("₱950.00");
  await selectExpenseDay(page, 2);
  await expect(page.locator(".expense-day-toggle").nth(1)).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  await closedToggle.click();
  await expect(closedToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator(".expense-day-body")).toHaveCount(1);

  await expect(
    page.getByRole("combobox", { name: "Allowance day", exact: true }),
  ).toHaveCount(0);
  await expect(page.locator(".expenses-panel .entry-row")).toHaveCount(0);
  await expect(
    page
      .getByRole("region", { name: "Selected day expenses", exact: true })
      .getByRole("button", { name: "Record expense", exact: true }),
  ).toHaveCount(1);
  await page
    .getByRole("region", { name: "Selected day expenses", exact: true })
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Allowance day", exact: true }),
  ).toContainText("Day 1");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("25.25");
  await page.getByRole("dialog").getByLabel("Note").fill("Afternoon snack");
  await chooseOption(
    page
      .getByRole("dialog")
      .getByRole("combobox", { name: "Allowance day", exact: true }),
    "1",
  );
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱25.25");
  await expect(page.locator(".save-message")).toContainText("saved");
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  await expect(page.locator(".save-message")).toHaveText("");
  const records = page.getByRole("region", {
    name: "Expense records",
    exact: true,
  });
  await menuAction(records, "Edit Afternoon snack");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("20");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱20.00");
  await page.reload();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱20.00");
  page.once("dialog", (dialog) => dialog.dismiss());
  await menuAction(records, "Delete Afternoon snack");
  await expect(page.getByTestId("expenses-total")).toHaveText("₱20.00");
  page.once("dialog", (dialog) => dialog.accept());
  await menuAction(records, "Delete Afternoon snack");
  await expect(page.getByTestId("expenses-total")).toHaveText("₱0.00");
  await expect(page.getByTestId("daily-remaining")).toHaveText("₱150.00");
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await page.getByRole("checkbox", { name: /^Day 1 My savings/ }).uncheck();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await expect(page.getByTestId("expenses-total")).toHaveText("₱0.00");
  await expect(page.getByTestId("daily-remaining")).toHaveText("₱200.00");
  await expect(page.locator(".expense-day-records")).toContainText(
    "No expenses yet",
  );
});

test("separates selected-day assignments from all-time expenses and preserves scope when selecting days", async ({
  page,
}) => {
  let book = savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "savings",
          name: "My savings",
          archived: false,
          goal: null,
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
      note: "School week",
    },
  );
  book = setSavingsDay(
    setAllowanceDay(book, "school", 1, true),
    "school",
    1,
    "savings",
    true,
  );
  book = setAllowanceDay(book, "school", 2, true);
  book = setNoClass(book, "school", 3, true);
  for (const [note, amount, day] of [
    ["Lunch", 2500, 1],
    ["Backdated supplies", 24000, 2],
    ["Unassigned snack", 1000, undefined],
  ] as const) {
    book = withEntry(
      book,
      makeEntry("expense", amount, {
        date: "2026-11-16",
        note,
        allowancePeriodId: "school",
        allowanceDayNumber: day,
      }),
    );
  }
  await page.goto("/#settings");
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "expense-scope.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(book)),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  const rows = page
    .getByRole("region", { name: "Expense records", exact: true })
    .locator(".entry-row");
  const dailyRows = page.locator(".expense-day-records .entry-row");
  await expect(page.getByTestId("expenses-total")).toHaveText("₱275.00");
  await expect(rows).toHaveCount(3);
  await expect(dailyRows).toHaveCount(1);
  await selectExpenseDay(page, 1);
  await expect(rows).toHaveCount(3);
  await expect(dailyRows).toHaveCount(1);
  await expect(dailyRows).toContainText("Lunch");
  await expect(page.getByTestId("daily-remaining")).toHaveText("₱125.00");
  await selectExpenseDay(page, 2);
  await expect(rows).toHaveCount(3);
  await expect(dailyRows).toHaveCount(1);
  await expect(dailyRows).toContainText("Backdated supplies");
  await expect(page.getByTestId("daily-remaining")).toHaveText("-₱40.00");
  await expect(page.getByText(/spent on selected day/)).toHaveCount(0);
  await expect(page.locator(".expense-day-note")).toHaveCount(0);
  await expect(page.getByTestId("daily-remaining")).toHaveClass(/over-budget/);
  await expect(
    page.getByRole("button", { name: "View day in Allowance", exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("expenses-total")).toHaveText("₱275.00");
  await page
    .getByRole("region", { name: "Selected day expenses", exact: true })
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByLabel("Allowance day", { exact: true }),
  ).toContainText("Day 2");
  await page.keyboard.press("Escape");
  for (const width of [1440, 1024, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`expenses-negative-${width}.png`),
      fullPage: true,
    });
  }
  await selectExpenseDay(page, 3);
  await expect(page.getByTestId("daily-remaining")).toHaveText("—");
  await expect(page.locator(".expense-day-records")).toContainText("No class");
  await expect(rows).toHaveCount(3);
  await expect(dailyRows).toHaveCount(0);
  await expect(rows.filter({ hasText: "Unassigned snack" })).toBeVisible();
});
