import { test, expect } from "@playwright/test";

test.describe("Live guidance smoke", () => {
  test("fresh install flow placeholder", async ({ page }) => {
    await page.goto("http://localhost:5173");
    await expect(page.getByTestId("home-dashboard")).toBeVisible();
    await page.getByTestId("btn-analyze-conversation").click();
    await expect(page.getByTestId("start-meeting-modal")).toBeVisible();
    for (let i = 0; i < 5; i++) {
      await page.getByTestId("btn-start-meeting-next").click();
    }
    await page.getByTestId("btn-start-meeting-confirm").click();
    await expect(page.getByTestId("live-assistant")).toBeVisible();
    await expect(page.getByTestId("btn-start")).toBeVisible();
  });
});
