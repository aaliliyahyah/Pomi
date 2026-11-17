import { expect, test } from "@playwright/test";
import { chooseOption } from "./helpers";

test("supports keyboard selection, cancellation, typeahead, and dialog focus", async ({
  page,
}) => {
  await page.goto("/#savings");
  await page.getByRole("button", { name: "New fund", exact: true }).click();
  const frequency = page.getByRole("combobox", { name: "Saving frequency" });
  await expect(frequency).toHaveCSS("border-top-width", "0px");
  await frequency.focus();
  await page.keyboard.press("ArrowDown");
  await expect(frequency).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("listbox")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(frequency).toBeFocused();
  await expect(frequency).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("End");
  await page.keyboard.press("Enter");
  await expect(frequency).toHaveText("Flexible — save any amount");
  await expect(page.getByLabel("Daily savings amount")).toHaveCount(0);
  await page.keyboard.type("fix");
  await page.keyboard.press("Tab");
  await expect(frequency).toHaveText("Fixed daily");
  await expect(page.getByLabel("Daily savings amount")).toBeVisible();
  await frequency.click();
  await page.getByRole("heading", { name: "Create savings fund" }).click();
  await expect(frequency).toHaveAttribute("aria-expanded", "false");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "New fund", exact: true }),
  ).toBeFocused();
});

test("keeps popup options within a narrow viewport and filters using selected values", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/#history");
  const fund = page.getByRole("combobox", { name: "Fund", exact: true });
  await fund.click();
  const popup = page.getByRole("listbox");
  const box = await popup.boundingBox();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(320);
  expect(box!.y + box!.height).toBeLessThanOrEqual(720);
  await page
    .getByRole("option", { name: "Allowance only", exact: true })
    .click();
  await expect(fund).toHaveText("Allowance only");
  await expect(page.locator(".entry-row")).toHaveCount(1);
  await chooseOption(fund, "");
  await expect(page.locator(".entry-row")).toHaveCount(2);
});

test("switches the inline fund checklist, retains selection, and replaces filtered selections", async ({
  page,
}) => {
  await page.goto("/#savings");
  await page.getByRole("button", { name: "New fund", exact: true }).click();
  await page.getByLabel("Fund name", { exact: true }).fill("Emergency savings");
  await chooseOption(page.getByLabel("Saving frequency"), "flexible");
  await page.getByRole("button", { name: "Create fund", exact: true }).click();
  await page
    .getByRole("button", { name: "View checklist for Emergency savings" })
    .click();
  await expect(page.locator("#fund-checklist-heading")).toHaveText(
    "Emergency savings",
  );
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(
    page.getByText("Saved on this device", { exact: true }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await expect(page.locator("#fund-checklist-heading")).toHaveText(
    "Emergency savings",
  );
  const fund = page
    .getByRole("article")
    .filter({
      has: page.getByRole("heading", {
        name: "Emergency savings",
        exact: true,
      }),
    });
  await fund.locator("summary").click();
  await fund.getByRole("button", { name: "Archive fund", exact: true }).click();
  await expect(page.locator("#fund-checklist-heading")).toHaveText(
    "My savings",
  );
  await page.getByLabel("Show archived").check();
  await expect(page.locator("#fund-checklist-heading")).toHaveText(
    "My savings",
  );
});
