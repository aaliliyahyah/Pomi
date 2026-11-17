import { expect, test } from "@playwright/test";
import { emptyNotebook, exportBackup, makeEntry } from "../src/model";
import { chooseOption, menuAction } from "./helpers";
for (const width of [1440, 320]) {
  test(`manages archived and deleted funds safely in Settings at ${width}px`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const book = emptyNotebook();
    book.initialized = true;
    book.funds = [
      {
        id: "history",
        name: "School supplies",
        goal: 20000,
        archived: false,
        savingMode: "flexible",
      },
      {
        id: "empty",
        name: "Future adventure",
        goal: null,
        archived: false,
        savingMode: "flexible",
      },
    ];
    book.entries = [
      makeEntry("opening_savings", 5000, { fundId: "history" }),
      makeEntry("opening_savings", 0, { fundId: "empty" }),
    ];
    await page.goto("/#settings");
    await page.getByLabel("Choose Pomi backup").setInputFiles({
      name: "funds.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportBackup(book)),
    });
    await page.getByRole("button", { name: "Replace and restore" }).click();
    await page.getByRole("link", { name: "Savings", exact: true }).click();
    await expect(page.getByLabel("Show archived")).toHaveCount(0);
    await page.getByLabel("Fund actions", { exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Delete fund", exact: true }),
    ).toBeDisabled();
    await page
      .getByRole("button", { name: "Archive fund", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Savings fund" }),
    ).toContainText("Future adventure");
    await expect(page.locator(".savings-total strong")).toHaveText("₱50.00");
    await menuAction(page, "Delete fund");
    const confirm = page.getByRole("dialog", { name: "Delete record?" });
    await confirm
      .getByRole("button", { name: "Delete record", exact: true })
      .click();
    await expect(
      page.getByRole("combobox", { name: "Savings fund" }),
    ).toHaveCount(0);
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    const archived = page.getByRole("region", {
      name: "Archived funds",
      exact: true,
    });
    const deleted = page.getByRole("region", {
      name: "Deleted funds",
      exact: true,
    });
    await expect(archived).toContainText("School supplies");
    await expect(archived).toContainText("₱50.00");
    await expect(deleted).toContainText("Future adventure");
    await page.reload();
    await expect(deleted).toContainText("Future adventure");
    await page.evaluate(() => {
      const original = IDBObjectStore.prototype.put;
      IDBObjectStore.prototype.put = function (
        ...args: Parameters<typeof original>
      ) {
        if (this.name === "notebooks") {
          IDBObjectStore.prototype.put = original;
          throw new Error("Unable to restore fund.");
        }
        return original.apply(this, args);
      };
    });
    const restore = deleted.getByRole("button", {
      name: "Restore fund Future adventure from deleted funds",
      exact: true,
    });
    await restore.click();
    await expect(page.getByRole("alert")).toContainText(
      "Unable to restore fund. Try again.",
    );
    await expect(restore).toBeEnabled();
    await restore.click();
    await expect(deleted).toContainText("No deleted funds");
    await archived
      .getByRole("button", {
        name: "Restore fund School supplies from archives",
        exact: true,
      })
      .click();
    await page.getByRole("link", { name: "Savings", exact: true }).click();
    await expect(
      page.locator(".savings-fund-selector select option"),
    ).toHaveCount(2);
    await expect(page.locator(".savings-total strong")).toHaveText("₱50.00");
    await chooseOption(
      page.getByRole("combobox", { name: "Savings fund" }),
      "empty",
    );
    await menuAction(page, "Delete fund");
    await confirm
      .getByRole("button", { name: "Delete record", exact: true })
      .click();
    await page.getByRole("link", { name: "Settings", exact: true }).click();
    const downloaded = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Export backup", exact: true })
      .click();
    const path = test.info().outputPath("with-deleted-fund.json");
    await (await downloaded).saveAs(path);
    await deleted
      .getByRole("button", {
        name: "Delete permanently: Future adventure",
        exact: true,
      })
      .click();
    const permanent = page.getByRole("dialog", {
      name: "Delete Future adventure permanently?",
      exact: true,
    });
    await expect(
      permanent.getByRole("button", { name: "Cancel", exact: true }),
    ).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(deleted).toContainText("Future adventure");
    await deleted
      .getByRole("button", {
        name: "Delete permanently: Future adventure",
        exact: true,
      })
      .click();
    await permanent
      .getByRole("button", { name: "Delete permanently", exact: true })
      .click();
    await expect(deleted).toContainText("No deleted funds");
    await page.getByLabel("Choose Pomi backup").setInputFiles(path);
    await page.getByRole("button", { name: "Replace and restore" }).click();
    await expect(deleted).toContainText("Future adventure");
    await page.evaluate(() => navigator.serviceWorker.ready);
    await page.reload();
    await context.setOffline(true);
    await page.reload();
    await expect(deleted).toContainText("Future adventure");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`fund-management-${width}.png`),
      fullPage: true,
    });
    await context.setOffline(false);
  });
}
