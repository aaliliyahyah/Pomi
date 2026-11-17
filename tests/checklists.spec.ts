import { chooseOption } from "./helpers";
import { configureSavings, menuAction, openAllowanceForm } from "./helpers";
import { expect, test, type Page } from "@playwright/test";

async function addPeriod(page: Page, note: string, total = "1000", days = "3") {
  await openAllowanceForm(page);
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Total allowance given").fill(total);
  await page.getByLabel("Number of days").fill(days);
  await page.getByRole("dialog").getByLabel("Note").fill(note);
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
}
const allowance = (page: Page, day: number) =>
  page.getByRole("checkbox", { name: new RegExp(`^Day ${day} allowance `) });
const saved = (page: Page, day: number) =>
  page.getByRole("checkbox", { name: new RegExp(`^Day ${day} My savings `) });

test("checks allowance and savings together, corrects money taken, and restores checklists offline", async ({
  page,
  context,
}) => {
  await page.goto("/");
  await configureSavings(page);
  await addPeriod(page, "School week");
  await expect(saved(page, 1)).toBeDisabled();
  await allowance(page, 1).check();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱1,000.00");
  const notice = await page.locator(".save-message").boundingBox();
  const dayControl = await allowance(page, 1).boundingBox();
  expect(
    notice &&
      dayControl &&
      (notice.y + notice.height <= dayControl.y ||
        notice.y >= dayControl.y + dayControl.height),
  ).toBeTruthy();
  await expect(saved(page, 2)).toBeDisabled();
  await saved(page, 1).check();
  await expect(page.getByTestId("savings-balance")).toHaveText("₱50.00");
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱950.00");
  await allowance(page, 1).click();
  await expect(page.getByRole("alert")).toContainText(
    "Uncheck this day's savings",
  );
  await expect(allowance(page, 1)).toBeChecked();
  await page.getByRole("link", { name: "Expenses", exact: true }).click();
  await page
    .getByRole("region", { name: "Selected day expenses", exact: true })
    .getByRole("button", { name: "Record expense", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("25");
  await page.getByRole("dialog").getByLabel("Note").fill("Money taken");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱925.00");
  await page.getByRole("link", { name: "History", exact: true }).click();
  await menuAction(page, "Edit Money taken");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("20");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await menuAction(page, "Edit Day 1 saved");
  await expect(page).toHaveURL(/#allowance$/);
  await expect(
    page.getByRole("region", { name: "Day 1", exact: true }),
  ).toBeFocused();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱930.00");
  await page.reload();
  await expect(allowance(page, 1)).toBeChecked();

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const backup = test.info().outputPath("checklists.json");
  await (await downloadPromise).saveAs(backup);
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await allowance(page, 2).check();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱930.00");
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Choose Pomi backup").setInputFiles(backup);
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(allowance(page, 2)).not.toBeChecked();
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await expect
    .poll(() => page.evaluate(() => !!navigator.serviceWorker.controller))
    .toBe(true);
  await context.setOffline(true);
  await page.reload();
  await expect(allowance(page, 1)).toBeChecked();
  await allowance(page, 2).check();
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱930.00");
  await saved(page, 2).check();
  await expect(page.getByTestId("savings-balance")).toHaveText("₱100.00");
  await page.reload();
  await expect(saved(page, 2)).toBeChecked();
  await context.setOffline(false);
});

test("keeps completed rates and shares period selection between Allowance and Savings", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await configureSavings(page);
  await addPeriod(page, "First period");
  await allowance(page, 1).check();
  await page.getByRole("button", { name: "Edit period" }).click();
  await page.getByLabel("Daily allowance amount").fill("250");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await expect(allowance(page, 1)).toHaveAccessibleName(
    "Day 1 allowance ₱200.00",
  );
  await expect(allowance(page, 2)).toHaveAccessibleName(
    "Day 2 allowance ₱250.00",
  );
  await allowance(page, 2).check();
  await addPeriod(page, "Second period", "1400", "7");
  await expect(page.getByRole("region", { name: /^Day \d+$/ })).toHaveCount(7);
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱2,400.00");
  const firstId = await page
    .locator(".period-selector select option")
    .filter({ hasText: "First period" })
    .getAttribute("value");
  await chooseOption(
    page.getByLabel("Allowance period", { exact: true }),
    firstId!,
  );
  await expect(page.getByTestId("allowance-balance")).toHaveText("₱2,400.00");
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await page
    .getByRole("button", { name: "View checklist for My savings" })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Allowance period", exact: true }),
  ).toContainText("First period");
  await saved(page, 1).check();
  await menuAction(page, "Edit fund");
  await page.getByLabel("Daily savings amount").fill("100");
  await page.getByRole("button", { name: "Save fund", exact: true }).click();
  await page
    .getByRole("button", { name: "View checklist for My savings" })
    .click();
  await expect(saved(page, 1)).toHaveAccessibleName("Day 1 My savings ₱50.00");
  await expect(saved(page, 2)).toHaveAccessibleName("Day 2 My savings ₱100.00");
  await saved(page, 2).check();
  await expect(page.locator(".selected-fund .fund-value")).toHaveText(
    "₱150.00",
  );
  await page.screenshot({
    path: test.info().outputPath("savings-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(saved(page, 2)).toBeChecked();
  await page.screenshot({
    path: test.info().outputPath("checkin-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({
    path: test.info().outputPath("checkin-desktop.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
