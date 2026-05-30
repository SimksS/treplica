import { test, expect } from "@playwright/test";

test.describe("Provider and privacy smoke", () => {
  test("navigates to provider settings", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();
    await expect(page.getByTestId("provider-settings-view")).toBeVisible();
    await expect(page.getByTestId("btn-create-provider")).toBeVisible();
  });

  test("can exit settings back to home", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-settings").click();
    await expect(page.getByTestId("settings-sidebar")).toBeVisible();
    await page.getByTestId("btn-close-settings").click();
    await expect(page.getByTestId("home-dashboard")).toBeVisible();
  });

  test("shows hosted privacy warning flow", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.getByTestId("nav-settings").click();
    await page.getByTestId("nav-settings-privacy").click();
    await expect(page.getByTestId("privacy-settings-view")).toBeVisible();
    await page.getByTestId("privacy-hosted_default").click();
    await expect(page.getByTestId("hosted-privacy-warning")).toBeVisible();
    await expect(page.getByTestId("btn-ack-hosted-warning")).toBeVisible();
  });
});
