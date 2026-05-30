import { test, expect } from "@playwright/test";

test.describe("Stealth settings smoke", () => {
  test("stealth settings panel shows status", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-settings").click();
    await page.getByTestId("nav-settings-stealth").click();
    await expect(page.getByTestId("stealth-settings-view")).toBeVisible();
    await expect(page.getByTestId("btn-toggle-stealth")).toBeVisible();
  });
});
