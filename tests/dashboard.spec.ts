import { chooseOption } from "./helpers";
import { expect, test } from "@playwright/test";
import { configureSavings, menuAction, openAllowanceForm } from "./helpers";

test("configures school days, skips reversibly, tracks savings and shows due reminders", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T18:00:00") });
  await page.goto("/");
  await configureSavings(page);
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("Default daily allowance").fill("200");
  await page.getByLabel("Default daily savings").fill("50");
  await page.getByLabel("Remind me to save while Pomi is open").check();
  await page.getByRole("button", { name: "Save preferences" }).click();
  await expect(
    page.getByRole("status").filter({ hasText: "preferences saved" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await openAllowanceForm(page);
  await expect(page.getByLabel("Daily allowance amount")).toHaveValue("200.00");
  await page.getByLabel("Total allowance given").fill("1000");
  await page.getByLabel("Number of days").fill("3");
  await page.getByLabel("School start date").fill("2026-11-16");
  await expect(page.locator(".schedule-preview")).toContainText("Nov 18, 2026");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  const first = page.getByRole("region", { name: "Day 1", exact: true });
  await expect(first.getByRole("heading")).toContainText("Nov 16, 2026");
  await expect(
    first.locator(".day-spent, .day-balance, .day-status"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("complementary", { name: "Savings reminder" }),
  ).toBeVisible();
  await first.getByRole("button", { name: "Mark no class" }).focus();
  await page.keyboard.press("Space");
  await expect(first).toHaveClass(/is-skipped/);
  await expect(first.getByRole("heading").locator("..")).toContainText(
    "No class",
  );
  await expect(
    first.getByRole("button", { name: "Record expense" }),
  ).toHaveCount(0);
  await expect(
    first.getByRole("button", { name: "Restore school day" }),
  ).toBeFocused();
  await expect(first.getByRole("checkbox")).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Completed allowance days" }),
  ).toHaveCount(0);
  await first.getByRole("button", { name: "Restore school day" }).click();
  await first.getByRole("checkbox", { name: /^Day 1 allowance/ }).check();
  await expect(
    first.getByRole("checkbox", { name: /^Day 1 allowance/ }),
  ).toBeChecked();
  await first.getByRole("checkbox", { name: /^Day 1 My savings/ }).check();
  await expect(first).toHaveClass(/is-completed/);
  await expect(
    page.getByRole("complementary", { name: "Savings reminder" }),
  ).not.toBeVisible();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(
    page
      .getByRole("region", { name: "Available allowance", exact: true })
      .getByRole("button", { name: "Add allowance", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Add allowance", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).not.toBeVisible();

  await page.getByRole("link", { name: "Settings", exact: true }).click();
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export backup" }).click();
  await (await downloaded).saveAs(test.info().outputPath("scheduled.json"));
  await expect(page.getByText(/Last backup exported:/)).not.toContainText(
    "No backup",
  );
  await expect(
    page.getByText(
      "Clearing browser data may permanently delete your records. Export a backup to keep a separate copy.",
    ),
  ).toBeVisible();
});

test("keeps flexible funds compact, confirms deletion and restores menu focus", async ({
  page,
}) => {
  await page.goto("/#savings");
  await expect(page.locator(".savings-funds .day-control")).toHaveCount(0);
  await menuAction(page, "New fund");
  await page.getByLabel("Fund name", { exact: true }).fill("Extra money");
  await chooseOption(page.getByLabel("Saving frequency"), "flexible");
  await expect(page.getByLabel("Daily savings amount")).toHaveCount(0);
  await page.getByRole("button", { name: "Create fund", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await chooseOption(page.getByRole("combobox", { name: "Savings fund" }), {
    label: "Extra money",
  });
  const fund = page
    .locator(".savings-heading details")
    .filter({ has: page.getByLabel("Fund actions", { exact: true }) });
  await expect(page.locator(".fund-details-content")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Fund details", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await fund.locator("summary").focus();
  await page.keyboard.press("Enter");
  await page.keyboard.press("Tab");
  await page.keyboard.press("Escape");
  await expect(fund.locator("summary")).toBeFocused();
  await menuAction(page, "Add Savings");
  await chooseOption(page.getByLabel("Where is this money from?"), "extra");
  await page
    .getByRole("dialog")
    .getByRole("spinbutton", { name: "Amount", exact: true })
    .fill("100");
  await page.getByRole("button", { name: "Save entry", exact: true }).click();
  await expect(page.locator(".fund-details-content")).toContainText("₱100.00");
  await fund.locator("summary").click();
  await expect(
    fund.getByRole("button", { name: "Delete fund" }),
  ).toBeDisabled();
  await expect(fund).toContainText("Archive it to keep your records safe");
  await page.keyboard.press("Escape");
  await page.getByRole("link", { name: "History", exact: true }).click();
  await expect(page.locator(".entry-date-group > h3").first()).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Delete Savings deposit", exact: true }),
  ).not.toBeVisible();
  await menuAction(page, "Delete Savings deposit");
  const confirmation = page.getByRole("dialog", { name: "Delete record?" });
  await expect(
    confirmation.getByRole("button", { name: "Cancel", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(
    page
      .locator(".entry-row")
      .filter({ hasText: "Savings deposit" })
      .locator("summary"),
  ).toBeFocused();
  await menuAction(page, "Delete Savings deposit");
  await confirmation
    .getByRole("button", { name: "Cancel", exact: true })
    .click();
  await expect(
    page.locator(".entry-row").filter({ hasText: "Savings deposit" }),
  ).toHaveCount(1);
  await menuAction(page, "Delete Savings deposit");
  await page
    .getByRole("dialog", { name: "Delete record?" })
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await expect(
    page.locator(".entry-row").filter({ hasText: "Savings deposit" }),
  ).toHaveCount(0);
  await expect(page.locator("#history-transactions-title")).toBeFocused();
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  await fund.locator("summary").click();
  await fund.getByRole("button", { name: "Delete fund" }).click();
  await page
    .getByRole("dialog", { name: "Delete record?" })
    .getByRole("button", { name: "Delete record", exact: true })
    .click();
  await expect(
    page
      .locator(".savings-fund-selector select option")
      .filter({ hasText: "Extra money" }),
  ).toHaveCount(0);
});

test("renders realistic content at desktop and tablet widths", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await page.clock.install({ time: new Date("2026-11-16T12:00:00") });
  await page.goto("/");
  await configureSavings(page);
  await openAllowanceForm(page);
  await page.getByLabel("Total allowance given").fill("1000");
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Number of days").fill("5");
  await page.getByRole("dialog").getByLabel("Note").fill("School week");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await page.getByRole("checkbox", { name: /^Day 1 allowance/ }).check();
  await page.getByRole("checkbox", { name: /^Day 1 My savings/ }).check();
  await page
    .getByRole("region", { name: "Day 2", exact: true })
    .getByRole("button", { name: "Mark no class" })
    .click();
  await page.getByRole("link", { name: "Savings", exact: true }).click();
  for (const name of ["School supplies", "Emergency money"]) {
    await menuAction(page, "New fund");
    await page.getByLabel("Fund name", { exact: true }).fill(name);
    await chooseOption(page.getByLabel("Saving frequency"), "flexible");
    await page.getByLabel("Goal amount").fill("1000");
    await page
      .getByRole("spinbutton", { name: "Already saved", exact: true })
      .fill("250");
    await page
      .getByRole("button", { name: "Create fund", exact: true })
      .click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  }
  for (const width of [1440, 1024, 768, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const section of [
      "Home",
      "Allowance",
      "Expenses",
      "Savings",
      "History",
      "Settings",
    ]) {
      await page.getByRole("link", { name: section, exact: true }).click();
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${section} at ${width}px`,
      ).toBe(true);
      await expect(page.locator(".page-footer, .connection")).toHaveCount(0);
      expect(
        await page
          .locator("main")
          .evaluate((main) => getComputedStyle(main).paddingBottom),
        `bottom spacing at ${section} ${width}px`,
      ).toBe(width <= 760 ? "32px" : "40px");
      if (section === "Allowance" && width === 1440) {
        const restore = page.getByRole("button", {
          name: "Restore school day",
          exact: true,
        });
        const lines = await restore.evaluate((button) => {
          const label = [...button.childNodes].find(
            (node) =>
              node.nodeType === Node.TEXT_NODE &&
              node.textContent?.includes("Restore school day"),
          )!;
          const range = document.createRange();
          range.selectNodeContents(label);
          return range.getClientRects().length;
        });
        expect(lines).toBe(1);
      }
      if (section === "Home") {
        const overview = await page
          .locator(".dashboard-overview")
          .boundingBox();
        const cards = page.locator(".balance-grid > section");
        await expect(cards).toHaveCount(3);
        const allowance = await cards.nth(0).boundingBox();
        const savings = await cards.nth(1).boundingBox();
        const expenses = await cards.nth(2).boundingBox();
        const funds = await page.locator(".dashboard-funds").boundingBox();
        const activity = await page.locator(".recent-panel").boundingBox();
        const checkin = await page.locator(".home-checkin-row").boundingBox();
        await expect(
          page.getByRole("button", { name: "Add allowance", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Record expense", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Open daily check-in", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("region", { name: "Weekly savings progress" }),
        ).toBeVisible();
        await expect(page.getByTestId("home-expenses-total")).toHaveText(
          "₱0.00",
        );
        expect(checkin!.y).toBeGreaterThanOrEqual(
          overview!.y + overview!.height,
        );
        expect(funds!.y).toBeGreaterThanOrEqual(checkin!.y + checkin!.height);
        if (width > 1100) {
          expect(Math.abs(allowance!.width - savings!.width)).toBeLessThan(2);
          expect(Math.abs(allowance!.width - expenses!.width)).toBeLessThan(2);
          expect(Math.abs(allowance!.height - savings!.height)).toBeLessThan(2);
          expect(Math.abs(allowance!.height - expenses!.height)).toBeLessThan(
            2,
          );
        } else {
          if (width > 480) {
            expect(Math.abs(savings!.y - allowance!.y)).toBeLessThan(2);
          } else {
            expect(savings!.y).toBeGreaterThan(allowance!.y);
          }
          expect(expenses!.y).toBeGreaterThan(savings!.y);
        }
        if (width > 1100) {
          expect(Math.abs(funds!.y - activity!.y)).toBeLessThan(2);
        } else {
          expect(activity!.y).toBeGreaterThanOrEqual(funds!.y + funds!.height);
        }
        await expect(page.locator(".home-fund-summary")).toHaveCount(3);
      }
      await page.screenshot({
        path: test.info().outputPath(`${section.toLowerCase()}-${width}.png`),
        fullPage: true,
      });
    }
  }
});

test("offers allowance setup from Home and tracks days in Allowance", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2026-11-16T12:00:00") });
  await page.goto("/");
  await expect(
    page
      .getByRole("region", { name: "Available allowance", exact: true })
      .getByRole("button", { name: "Add allowance", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".bottom-note")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Add allowance", exact: true }),
  ).toHaveCount(1);
  await openAllowanceForm(page);
  await page.getByLabel("Total allowance given").fill("600");
  await page.getByLabel("Daily allowance amount").fill("200");
  await page.getByLabel("Number of days").fill("3");
  await page.getByLabel("School start date").fill("2026-11-23");
  await page
    .getByRole("button", { name: "Save allowance", exact: true })
    .click();
  await expect(
    page.locator(".weekly-disclosure, .period-overview, .checkin-hint"),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await page.getByRole("link", { name: "Allowance", exact: true }).click();
  await expect(page).toHaveURL(/#allowance$/);
  for (const day of [1, 2, 3])
    await page
      .getByRole("region", { name: `Day ${day}`, exact: true })
      .getByRole("button", { name: "Mark no class" })
      .click();
  await expect(page.locator(".day-balance > small")).toHaveCount(0);
  await expect(page.locator(".checkin-day input[type=checkbox]")).toHaveCount(
    0,
  );
});

test("keeps Home compact with a three-entry preview and full history access", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1368, height: 768 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(async () => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open("pomi-notebook");
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const database = request.result;
        const transaction = database.transaction("notebooks", "readwrite");
        const store = transaction.objectStore("notebooks");
        const get = store.get("main");
        get.onsuccess = () => {
          const book = get.result;
          book.entries.find(
            (entry: { kind: string }) => entry.kind === "opening_allowance",
          ).amount = 100000;
          book.entries.forEach((entry: { date: string }) => {
            entry.date = "2026-11-14";
          });
          book.entries.push(
            ...[1, 2, 3, 4].map((day) => ({
              id: `preview-${day}`,
              kind: "expense",
              amount: day * 100,
              date: `2026-11-${day === 4 ? "16" : "15"}`,
              note: `Preview expense ${day}`,
              fundId: null,
              source: null,
              createdAt: `2026-11-16T12:00:0${day}.000Z`,
            })),
          );
          store.put(book);
        };
        transaction.oncomplete = () => {
          database.close();
          resolve();
        };
        transaction.onerror = () => reject(transaction.error);
      };
    });
  });
  await page.reload();
  const preview = page.locator(".recent-panel");
  await expect(preview.locator(".entry-row")).toHaveCount(3);
  await expect(preview.locator(".entry-description > strong")).toHaveText([
    "Preview expense 4",
    "Preview expense 3",
    "Preview expense 2",
  ]);
  await expect(preview.locator(".entry-preview-date")).toHaveText([
    "Nov 16",
    "Nov 15",
    "Nov 15",
  ]);
  for (const collapsed of [false, true]) {
    if (collapsed)
      await page.getByRole("button", { name: /Collapse sidebar/i }).click();
    for (const selector of [
      ".dashboard-funds",
      ".recent-panel",
      ".home-expenses",
    ]) {
      const bounds = await page.locator(selector).boundingBox();
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(768);
    }
    await page.screenshot({
      path: test
        .info()
        .outputPath(`compact-home-${collapsed ? "collapsed" : "expanded"}.png`),
      fullPage: true,
    });
  }
  await preview.getByRole("link", { name: "View history" }).click();
  await expect(
    page.locator(".entry-row").filter({ hasText: "Preview expense" }),
  ).toHaveCount(4);
});
