import { expect, type Locator, type Page } from "@playwright/test";
export async function openAllowanceForm(page: Page) {
  const action = page.getByRole("button", {
    name: "Add allowance",
    exact: true,
  });
  if (!(await action.count()))
    await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await action.click();
}

export async function menuAction(scope: Page | Locator, name: string) {
  const page = "page" in scope ? scope.page() : scope;
  const button = page.getByRole("button", {
    name,
    exact: true,
    includeHidden: true,
  });
  const menu = scope.locator("details.action-menu").filter({ has: button });
  await menu.locator("summary").click();
  await menu.getByRole("button", { name, exact: true }).click();
}
export async function configureSavings(page: Page, amount = "50") {
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await menuAction(page, "Edit fund");
  await chooseOption(page.getByLabel("Saving frequency"), "fixed");
  await page.getByLabel("Daily savings amount").fill(amount);
  await page.getByRole("button", { name: "Save fund", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
}

export async function chooseOption(
  control: Locator,
  choice: string | { label: string },
) {
  const label = await control
    .locator("..")
    .locator("select option")
    .evaluateAll((options, chosen) => {
      const option = options.find((element) =>
        typeof chosen === "string"
          ? (element as HTMLOptionElement).value === chosen
          : element.textContent?.trim() === chosen.label,
      );
      if (!option) throw new Error(`Missing option: ${JSON.stringify(chosen)}`);
      return option.textContent!.trim();
    }, choice);
  await control.click();
  await control
    .page()
    .getByRole("option", { name: label, exact: true })
    .click();
}

export async function selectExpenseDay(page: Page, day: number) {
  const row = page.locator(".expense-day-toggle").nth(day - 1);
  if ((await row.getAttribute("aria-expanded")) !== "true") await row.click();
  await expect(row).toHaveAttribute("aria-expanded", "true");
}
