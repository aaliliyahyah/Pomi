import { expect, test } from "@playwright/test";
import {
  emptyNotebook,
  exportBackup,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
} from "../src/model";

for (const width of [1440, 320]) {
  test(`dismisses allowance feedback on the next click at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    let book = savePeriod(
      {
        ...emptyNotebook(),
        initialized: true,
        funds: [
          {
            id: "fund",
            name: "Savings",
            archived: false,
            savingMode: "fixed",
            dailyAmount: 5000,
            goal: null,
          },
        ],
      },
      {
        id: "period",
        total: 100000,
        dailyAmount: 20000,
        dayCount: 5,
        date: "2026-11-16",
        note: "School week",
      },
    );
    book = setSavingsDay(
      setAllowanceDay(book, "period", 1, true),
      "period",
      1,
      "fund",
      true,
    );
    await page.goto("/#settings");
    await page.getByLabel("Choose Pomi backup").setInputFiles({
      name: "feedback.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportBackup(book)),
    });
    await page.getByRole("button", { name: "Replace and restore" }).click();
    await page.getByRole("link", { name: "Allowance", exact: true }).click();
    const checkbox = page.getByRole("checkbox", { name: /^Day 1 allowance / });
    const error = page
      .getByRole("alert")
      .filter({ hasText: "Uncheck this day's savings" });
    await checkbox.click();
    await expect(error).toBeVisible();
    await expect(checkbox).toBeChecked();
    await error.click();
    await expect(error).toHaveCount(0);
    await checkbox.click();
    await expect(error).toBeVisible();
    await page.getByRole("heading", { name: "My allowance." }).click();
    await expect(error).toHaveCount(0);
    await expect(checkbox).toBeChecked();
  });
}
