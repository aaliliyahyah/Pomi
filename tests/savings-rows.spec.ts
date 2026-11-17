import { expect, test } from "@playwright/test";
import { emptyNotebook, exportBackup } from "../src/model";
for (const width of [1440, 320])
  test(`shows Savings with header fund selection at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    const book = emptyNotebook();
    book.initialized = true;
    book.funds = [
      {
        id: "a",
        name: "School supplies",
        goal: null,
        archived: false,
        savingMode: "flexible",
      },
      {
        id: "b",
        name: "Emergency savings",
        goal: null,
        archived: false,
        savingMode: "fixed",
        dailyAmount: 5000,
      },
    ];
    await page.goto("/#settings");
    await page.getByLabel("Choose Pomi backup").setInputFiles({
      name: "rows.json",
      mimeType: "application/json",
      buffer: Buffer.from(exportBackup(book)),
    });
    await page.getByRole("button", { name: "Replace and restore" }).click();
    await page.getByRole("link", { name: "Savings", exact: true }).click();
    await expect(page.locator(".empty-goal-track")).toBeVisible();
    await expect(page.locator(".empty-goal-track")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    await page.screenshot({
      path: test.info().outputPath(`empty-goal-${width}.png`),
      animations: "disabled",
    });
    const selector = page.getByRole("combobox", { name: "Savings fund" });
    await expect(selector).toContainText("School supplies");
    const selectorBox = (await selector.boundingBox())!;
    const addBox = (await page
      .getByLabel("Savings add options", { exact: true })
      .boundingBox())!;
    expect(Math.abs(selectorBox.y - addBox.y)).toBeLessThan(8);
    await selector.click();
    await page
      .getByRole("option", { name: "Emergency savings", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Daily checklist", exact: true }),
    ).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.getByRole("link", { name: "Savings", exact: true }).click();
    await expect(selector).toContainText("Emergency savings");
    await page
      .getByRole("button", { name: "Fund details", exact: true })
      .click();
    await expect(page.getByTestId("selected-fund-panel")).toContainText(
      "Fixed daily",
    );
    await page.getByLabel("Fund actions", { exact: true }).click();
    await page.getByRole("button", { name: "Edit fund", exact: true }).click();
    await page.getByLabel("Goal amount").fill("100");
    await page.getByRole("button", { name: "Save fund", exact: true }).click();
    await expect(page.locator(".empty-goal-track")).toHaveCount(0);
    const add = page.locator(".savings-slide-main");
    await add.focus();
    await expect(
      page.getByRole("button", { name: "New fund", exact: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: "Add Savings", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(add).toBeFocused();
    await add.focus();
    await add.focus();
    await page.getByRole("button", { name: "New fund", exact: true }).click();
    await expect(
      page.getByRole("dialog", { name: "Create savings fund" }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.mouse.move(0, 0);
    await page.keyboard.press("Escape");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`savings-selector-${width}.png`),
      fullPage: true,
    });
  });
