import { expect, test } from "@playwright/test";
import {
  emptyNotebook,
  exportBackup,
  savePeriod,
  setAllowanceDay,
  setSavingsDay,
} from "../src/model";

test("keeps financial summaries consistent and fund details keyboard accessible", async ({
  page,
}) => {
  test.setTimeout(90_000);
  let book = savePeriod(
    {
      ...emptyNotebook(),
      initialized: true,
      funds: [
        {
          id: "goal",
          name: "School supplies and a new bag for next term",
          archived: false,
          savingMode: "fixed",
          dailyAmount: 5000,
          goal: 100000,
        },
      ],
    },
    {
      id: "school",
      dailyAmount: 20000,
      total: 100000,
      dayCount: 5,
      date: "2026-11-15",
      startDate: "2026-11-16",
      schoolDays: [1, 2, 3, 4, 5],
      note: "School allowance for the coming week",
    },
  );
  book = setAllowanceDay(book, "school", 1, true);
  book = setSavingsDay(book, "school", 1, "goal", true);
  await page.goto("/#settings");
  await page.evaluate(() => document.fonts.ready);
  await page.getByLabel("Choose Pomi backup").setInputFiles({
    name: "design.json",
    mimeType: "application/json",
    buffer: Buffer.from(exportBackup(book)),
  });
  await page.getByRole("button", { name: "Replace and restore" }).click();
  await page.getByRole("button", { name: "Dismiss notification" }).click();
  const palette: Record<string, string> = {};
  for (const width of [1440, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const route of [
      "Home",
      "Allowance",
      "Expenses",
      "Savings",
      "History",
      "Settings",
    ]) {
      await page.getByRole("link", { name: route, exact: true }).click();
      await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}px`,
      ).toBe(true);
      const headingFont = await page
        .getByRole("heading", { level: 1 })
        .evaluate((el) => getComputedStyle(el).fontFamily);
      expect(headingFont).toContain("Lora");
      await expect(page.getByRole("main")).toHaveCSS("font-family", /DM Sans/);
      for (const amount of await page.locator(".summary-amount").all())
        await expect(amount).toHaveCSS("font-family", /Lora/);
      const summaries = await page
        .locator(".financial-summary")
        .evaluateAll((cards) => {
          const luminance = (color: string) => {
            const rgb = color
              .match(/[\d.]+/g)!
              .slice(0, 3)
              .map(Number)
              .map((c) => c / 255)
              .map((c) =>
                c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
              );
            return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
          };
          return cards.map((card) => {
            const style = getComputedStyle(card);
            const label = card.querySelector<HTMLElement>(".summary-label")!;
            const amount = card.querySelector<HTMLElement>(".summary-amount")!;
            const labelStyle = getComputedStyle(label),
              amountStyle = getComputedStyle(amount);
            const fg = luminance(labelStyle.color),
              bg = luminance(style.backgroundColor);
            return {
              role: [...card.classList].find((c) =>
                /^summary-(allowance|savings|spending|neutral)$/.test(c),
              )!,
              background: style.backgroundColor,
              font: amountStyle.fontFamily,
              labelSize: labelStyle.fontSize,
              amountSize: amountStyle.fontSize,
              weight: amountStyle.fontWeight,
              padding: style.paddingTop,
              radius: style.borderRadius,
              height: card.getBoundingClientRect().height,
              icons: card.querySelectorAll("svg:not(.button svg)").length,
              aligned:
                Math.abs(
                  label.getBoundingClientRect().x -
                    amount.getBoundingClientRect().x,
                ) < 1,
              ratio: (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05),
            };
          });
        });
      for (const summary of summaries) {
        expect(summary.labelSize).toBe("14px");
        expect(summary.amountSize).toBe("32px");
        expect(summary.weight).toBe("700");
        expect(summary.padding).toBe("24px");
        expect(summary.radius).toBe("16px");
        expect(summary.height).toBeGreaterThanOrEqual(124);
        expect(summary.aligned).toBe(true);
        expect(summary.icons).toBe(0);
        expect(summary.ratio).toBeGreaterThanOrEqual(4.5);
        palette[summary.role] ??= summary.background;
        expect(summary.background).toBe(palette[summary.role]);
      }
      if (route === "Home") {
        const card = (await page.locator(".home-daily-checkin").boundingBox())!;
        const action = (await page
          .getByRole("link", { name: "Open daily check-in", exact: true })
          .boundingBox())!;
        expect(
          Math.abs(card.x + card.width - action.x - action.width - 16),
        ).toBeLessThan(2);
        expect(
          Math.abs(card.y + card.height - action.y - action.height - 16),
        ).toBeLessThan(2);
        expect(action.height).toBeGreaterThanOrEqual(40);
      }
      if (route === "Home" && width > 1200) {
        const amountHeights = await page
          .locator(".recent-entry .entry-end > strong")
          .evaluateAll((elements) =>
            elements.map((el) => el.getBoundingClientRect().height),
          );
        expect(amountHeights.every((height) => height <= 24)).toBe(true);
      }
      if (route === "Allowance" || route === "Expenses") {
        const field = page.getByRole("combobox", {
          name: "Allowance period",
          exact: true,
        });
        await expect(field).toBeVisible();
        await expect(field).not.toContainText("₱");
        await expect(page.locator(".header-period-row")).toBeVisible();
        await expect(
          page.getByText("Period actions", { exact: true }),
        ).toHaveCount(0);
      }
      if (route === "Savings") {
        await expect(
          page.locator(".fund-frequency, .fund-card-goal"),
        ).toHaveCount(0);
        const group = page.getByRole("group", { name: "Fund view" });
        const details = group.getByRole("button", {
          name: "Fund details",
          exact: true,
        });
        await details.focus();
        await page.keyboard.press("Enter");
        await expect(details).toHaveAttribute("aria-pressed", "true");
        await expect(page.locator(".fund-details-content")).toBeVisible();
        await group
          .getByRole("button", { name: "Daily checklist", exact: true })
          .click();
      }
      await page.screenshot({
        path: test.info().outputPath(`${route.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
    }
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  // Text enlargement and a 720px viewport cover the reflow of a 1440px window at 200% zoom.
  await page.setViewportSize({ width: 720, height: 1000 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.locator("html")).toHaveCSS("font-size", "32px");
  for (const route of [
    "Home",
    "Allowance",
    "Expenses",
    "Savings",
    "History",
    "Settings",
  ]) {
    await page.getByRole("link", { name: route, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `${route} enlarged text`,
    ).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`${route.toLowerCase()}-enlarged.png`),
      fullPage: true,
    });
  }
});
