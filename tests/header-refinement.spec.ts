import { expect, test } from "@playwright/test";
import { menuAction, openAllowanceForm, chooseOption } from "./helpers";
for (const width of [1440, 320])
  test(`uses compact period headers and preserves editor focus at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    for (const note of ["School", "Training"]) {
      await openAllowanceForm(page);
      await page.getByLabel("Total allowance given").fill("1000");
      await page.getByLabel("Daily allowance amount").fill("200");
      await page.getByLabel("Number of days").fill("3");
      await page.getByRole("dialog").getByLabel("Note").fill(note);
      await page
        .getByRole("button", { name: "Save allowance", exact: true })
        .click();
    }
    for (const route of ["Allowance", "Expenses"]) {
      await page.getByRole("link", { name: route, exact: true }).click();
      const period = page.getByRole("combobox", {
        name: "Allowance period",
        exact: true,
      });
      await expect(period).toHaveText("Training");
      const triggerBox = (await period.boundingBox())!,
        menuBox = (await page
          .locator(".header-period-row summary")
          .boundingBox())!;
      expect(
        Math.abs(
          triggerBox.y + triggerBox.height / 2 - menuBox.y - menuBox.height / 2,
        ),
      ).toBeLessThan(2);
      await period.click();
      await expect(page.getByRole("option")).toHaveText(["Training", "School"]);
      const popup = (await page.getByRole("listbox").boundingBox())!;
      expect(popup.x + popup.width).toBeLessThanOrEqual(width);
      await page.screenshot({
        path: test.info().outputPath(`dropdown-${route}-${width}.png`),
        fullPage: true,
      });
      await page.getByRole("option", { name: "School", exact: true }).click();
      await menuAction(page.locator(".header-period-row"), "Edit period");
      await expect(page.getByRole("dialog").getByLabel("Note")).toHaveValue(
        "School",
      );
      await page.keyboard.press("Escape");
      await expect(page.locator(".header-period-row summary")).toBeFocused();
      await chooseOption(period, { label: "Training" });
      await expect(
        page.locator(
          ".period-toolbar, .expense-controls.daily-budget-selectors",
        ),
      ).toHaveCount(0);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBe(true);
      await page.screenshot({
        path: test.info().outputPath(`${route}-${width}.png`),
        fullPage: true,
      });
    }
    await page.getByRole("link", { name: "Savings", exact: true }).click();
    await menuAction(page.locator(".fund-browser"), "Edit fund");
    await expect(
      page.getByText("Additional details", { exact: true }),
    ).toHaveCount(0);
    await expect(page.getByLabel("Goal amount")).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "New fund", exact: true }).click();
    await expect(page.getByLabel("Goal amount")).toBeVisible();
    await expect(
      page.getByLabel("Already saved", { exact: true }),
    ).toBeVisible();
    await page.keyboard.press("Escape");
    await page.getByRole("link", { name: "History", exact: true }).click();
    await menuAction(page, "Delete Training");
    const button = page
      .getByRole("dialog")
      .getByRole("button", { name: "Delete record", exact: true });
    for (const state of ["default", "hover", "focus"]) {
      if (state === "hover") await button.hover();
      if (state === "focus") await button.focus();
      const ratio = await button.evaluate((el) => {
        const l = (c: string) => {
          const a = c
            .match(/[\d.]+/g)!
            .slice(0, 3)
            .map(Number)
            .map((v) => {
              v /= 255;
              return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
            });
          return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
        };
        const s = getComputedStyle(el),
          a = l(s.color),
          b = l(s.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    }
    await page.screenshot({
      path: test.info().outputPath(`delete-${width}.png`),
      fullPage: true,
    });
  });
