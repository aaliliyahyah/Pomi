import { configureSavings, openAllowanceForm } from "./helpers";
import { expect, test } from "@playwright/test";

test("supports keyboard navigation, accessible forms, and dialog focus restoration", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.getByRole("link", { name: "Savings", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveTitle("Savings · Pomi");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.getByRole("button", { name: "New fund", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "New fund", exact: true }),
  ).toBeFocused();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await openAllowanceForm(page);
  await page.getByLabel("Total allowance given").fill("1000");
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Number of days").fill("3");
  await expect(page.locator(".allowance-preview")).toContainText("₱600.00");
  await expect(page.locator(".allowance-preview")).toContainText("₱400.00");
  await page.screenshot({
    path: test.info().outputPath("allowance-form-desktop.png"),
    fullPage: true,
  });
  await page.getByLabel("Total allowance given").fill("100");
  await expect(page.locator(".allowance-preview")).toContainText(
    "More than the total received",
  );
  await page.getByLabel("Daily allowance amount").fill("0");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await expect(page.getByLabel("Daily allowance amount")).toBeFocused();
  await expect(page.getByLabel("Daily allowance amount")).toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.locator(".field-error")).toContainText("above ₱0");
  await page.getByLabel("Daily allowance amount").fill("20");
  await expect(page.getByLabel("Daily allowance amount")).not.toHaveAttribute(
    "aria-invalid",
    "true",
  );
  await expect(page.getByLabel("Total allowance given")).toHaveValue("100");
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Add allowance", exact: true }),
  ).toBeFocused();
});

test("reflows all sections at 320px, text enlargement, and large content", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/");
  await openAllowanceForm(page);
  await page.getByLabel("Total allowance given").fill("1000000000");
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Number of days").fill("3");
  await page
    .getByRole("dialog")
    .getByLabel("Note")
    .fill("A long school allowance name that wraps across the notebook");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.getByRole("checkbox", { name: /^Day 1 allowance / }).focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("checkbox", { name: /^Day 1 allowance / }),
  ).toBeChecked();
  for (const name of [
    "Home",
    "Allowance",
    "Expenses",
    "Savings",
    "History",
    "Settings",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const sizes = await page
      .locator('input:not([type="checkbox"]), select, textarea')
      .evaluateAll((elements) =>
        elements
          .filter((element) => element.getClientRects().length > 0)
          .map((element) => parseFloat(getComputedStyle(element).fontSize)),
      );
    expect(sizes.every((size) => size >= 16)).toBe(true);
    await page.screenshot({
      path: test.info().outputPath(`${name.toLowerCase()}-320.png`),
      fullPage: true,
    });
  }
  // 200% browser zoom on a 640px viewport has a 320 CSS-pixel layout. Also
  // enlarge text independently to catch fixed-size text containers.
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  for (const name of [
    "Home",
    "Allowance",
    "Expenses",
    "Savings",
    "History",
    "Settings",
  ]) {
    await page.getByRole("link", { name, exact: true }).click();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.screenshot({
    path: test.info().outputPath("text-resize-320.png"),
    fullPage: true,
  });
});

test("offers recovery from empty filters and validates primary contrast pairs", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Daily check-in" }),
  ).toHaveCount(1);
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Start a new page" }),
  ).toBeVisible();
  await expect(page.locator(".sticker-bow").first()).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Filter history", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("region", { name: "History filters" }),
  ).toBeVisible();
  await page.getByLabel("From", { exact: true }).fill("2099-01-01");
  await expect(
    page.getByRole("heading", { name: "No matching entries" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(page.locator(".entry-row")).toHaveCount(2);
  const pairs = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    function luminance(hex: string) {
      const value = hex.trim().replace("#", "");
      const rgb = (
        value.length === 3 ? [...value].map((v) => v + v).join("") : value
      )
        .match(/.{2}/g)!
        .map((v) => parseInt(v, 16) / 255)
        .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    }
    const tests = [
      ["--color-ink", "--color-bg", 4.5],
      ["--color-muted", "--color-bg", 4.5],
      ["--color-muted", "--color-blush", 4.5],
      ["--color-muted", "--color-peach", 4.5],
      ["--color-on-accent", "--color-complete", 4.5],
      ["--color-complete", "--color-complete-soft", 4.5],
      ["--color-ink", "--color-hover", 4.5],
      ["--color-control", "--color-disabled", 3],
      ["--color-on-accent", "--color-accent", 4.5],
      ["--color-control", "--color-surface", 3],
      ["--color-focus", "--color-bg", 3],
    ] as const;
    return tests.map(([fg, bg, minimum]) => {
      const a = luminance(root.getPropertyValue(fg));
      const b = luminance(root.getPropertyValue(bg));
      return {
        fg,
        bg,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
        minimum,
      };
    });
  });
  for (const pair of pairs)
    expect(pair.ratio, `${pair.fg} on ${pair.bg}`).toBeGreaterThanOrEqual(
      pair.minimum,
    );
});

test("measures rendered text contrast across all six sections", async ({
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

  for (const section of [
    "Home",
    "Allowance",
    "Expenses",
    "Savings",
    "History",
    "Settings",
  ]) {
    await page.getByRole("link", { name: section, exact: true }).click();
    const failures = await page.evaluate(() => {
      type Rgba = [number, number, number, number];
      function rgba(value: string): Rgba {
        const values = value.match(/[\d.]+/g)!.map(Number);
        return [values[0], values[1], values[2], values[3] ?? 1];
      }
      function blend(top: Rgba, base: Rgba): Rgba {
        return [0, 1, 2]
          .map((i) => top[i] * top[3] + base[i] * (1 - top[3]))
          .concat(1) as Rgba;
      }
      function luminance(color: Rgba) {
        const rgb = color
          .slice(0, 3)
          .map((v) => v / 255)
          .map((v) =>
            v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4,
          );
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      }
      const failures: string[] = [];
      for (const element of document.querySelectorAll<HTMLElement>("body *")) {
        if (
          !(element instanceof HTMLElement) ||
          !element.getClientRects().length ||
          element.closest('.visually-hidden, [aria-hidden="true"], :disabled')
        )
          continue;
        const text = [...element.childNodes]
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent)
          .join("")
          .trim();
        if (!text) continue;
        const style = getComputedStyle(element);
        if (style.visibility === "hidden") continue;
        const ancestors: HTMLElement[] = [];
        for (
          let node: HTMLElement | null = element;
          node;
          node = node.parentElement
        )
          ancestors.unshift(node);
        let background: Rgba = [255, 255, 255, 1];
        for (const ancestor of ancestors)
          background = blend(
            rgba(getComputedStyle(ancestor).backgroundColor),
            background,
          );
        const foreground = blend(rgba(style.color), background);
        const a = luminance(foreground),
          b = luminance(background);
        const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        const large =
          parseFloat(style.fontSize) >= 24 ||
          (parseFloat(style.fontSize) >= 18.67 &&
            parseInt(style.fontWeight) >= 700);
        if (ratio < (large ? 3 : 4.5))
          failures.push(
            `${text.slice(0, 50)}: ${ratio.toFixed(2)}:1 (${style.color} on ${background.slice(0, 3).join(",")})`,
          );
      }
      return failures;
    });
    expect(failures, section).toEqual([]);
  }
});

test("keeps Home as a dashboard and exposes aligned fund actions", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".topbar")).toHaveCount(0);
  await expect(page.getByText("YOURS TO USE", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("checkbox")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "All funds" })).toBeVisible();
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(page).toHaveURL(/#allowance$/);
  await expect(page).toHaveTitle("Allowance · Pomi");
  await expect(page.getByRole("heading", { level: 1 })).toBeFocused();
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  const summary = page.locator(".fund-more > summary").first();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".fund-more").getByRole("button", { name: "Edit fund" }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(
    page.locator(".fund-more").getByRole("button", { name: "Edit fund" }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.setViewportSize({ width: 1920, height: 1080 });
  const workspace = await page.locator(".workspace").boundingBox();
  const content = await page.getByRole("main").boundingBox();
  expect(content!.width).toBe(workspace!.width);
  await page.screenshot({
    path: test.info().outputPath("dashboard-wide.png"),
    fullPage: true,
  });
});
