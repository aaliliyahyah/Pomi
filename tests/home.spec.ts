import { expect, test } from "@playwright/test";
import { chooseOption } from "./helpers";
import {
  emptyNotebook,
  exportBackup,
  makeEntry,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
  withEntry,
} from "../src/model";

test("shows the reference dashboard, keeps summaries accurate, and opens today's check-in", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T12:00:00") });
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
        ...["Extra savings", "New bag fund", "Travel fund"].map(
          (name, index) => ({
            id: `fund-${index}`,
            name,
            archived: false,
            savingMode: "flexible" as const,
            dailyAmount: null,
            goal: null,
          }),
        ),
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
      note: "School week",
    },
  );
  book = setSavingsDay(
    setAllowanceDay(book, "school", 1, true),
    "school",
    1,
    "challenge",
    true,
  );
  // Keep same-day ordering independent of fixture creation speed and random IDs.
  book = {
    ...book,
    entries: book.entries.map((entry) => ({
      ...entry,
      createdAt: `${entry.date}T08:00:00.000Z`,
    })),
  };
  for (const [note, amount, date, assigned] of [
    ["Food", 5400, "2026-11-16", true],
    ["Transportation", 2500, "2026-11-15", false],
    ["School supplies", 15000, "2026-11-14", false],
  ] as const) {
    book = withEntry(
      book,
      makeEntry("expense", amount, {
        note,
        date,
        createdAt: `${date}T12:00:00.000Z`,
        ...(assigned
          ? { allowancePeriodId: "school", allowanceDayNumber: 1 }
          : {}),
      }),
    );
  }
  async function restore(data = book) {
    await page.goto("/#settings");
    await page.getByLabel("Choose Pomi backup").setInputFiles({
      name: "home.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportBackup(data)),
    });
    await page.getByRole("button", { name: "Replace and restore" }).click();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.getByRole("button", { name: "Dismiss notification" }).click();
  }
  await restore();
  await expect(
    page
      .getByRole("region", { name: "Available allowance", exact: true })
      .locator(".hero-balance"),
  ).toHaveText("₱721.00");
  await expect(
    page
      .getByRole("region", { name: "Total savings", exact: true })
      .locator(".hero-balance"),
  ).toHaveText("₱50.00");
  await expect(page.getByTestId("home-expenses-total")).toHaveText("₱229.00");
  await expect(page.locator(".home-fund-summary")).toHaveCount(3);
  await expect(
    page.getByRole("region", { name: "Weekly savings progress" }),
  ).toContainText("1 of 5 days");
  await expect(
    page.getByRole("progressbar", { name: "Completed savings days this week" }),
  ).toHaveAttribute("value", "1");
  await expect(page.locator(".recent-panel .entry-row")).toHaveCount(3);
  await expect(page.locator(".recent-panel .entry-preview-date")).toHaveCount(
    3,
  );
  await expect(page.locator(".recent-panel .entry-end")).toContainText([
    "−₱54.00",
    "+₱50.00",
    "−₱25.00",
  ]);
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`home-reference-${width}.png`),
      fullPage: true,
    });
  }
  await page
    .getByRole("link", { name: "Open daily check-in", exact: true })
    .focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("region", { name: "Day 1", exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: "All funds", exact: true }).click();
  await expect(page.locator(".savings-funds .fund-card")).toHaveCount(4);
  // A historical period selected elsewhere must not displace today's task.
  const history = savePeriod(book, {
    id: "old",
    total: 20000,
    dailyAmount: 10000,
    dayCount: 2,
    date: "2026-11-01",
    startDate: "2026-11-02",
    schoolDays: [1, 2, 3, 4, 5],
    note: "Earlier period",
  });
  await restore(history);
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await chooseOption(
    page.getByLabel("Allowance period", { exact: true }),
    "old",
  );
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Daily check-in", exact: true }),
  ).toContainText("Nov 16, 2026 · Day 1");
  await page
    .getByRole("link", { name: "Open daily check-in", exact: true })
    .click();
  await expect(
    page.getByLabel("Allowance period", { exact: true }),
  ).toContainText("School week");
  await expect(
    page.getByRole("region", { name: "Day 1", exact: true }),
  ).toBeFocused();
});
