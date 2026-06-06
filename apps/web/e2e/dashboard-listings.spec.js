import { expect, test } from "@playwright/test";

const authState = {
  state: {
    accessToken: "test-access-token",
    refreshToken: "test-refresh-token",
    csrfToken: "test-csrf-token",
    deviceFingerprint: "test-device-fingerprint",
    user: {
      id: "seller-1",
      email: "seller@example.test",
      fullName: "Seller One",
      role: "USER"
    }
  },
  version: 0
};

test("dashboard listings never renders the Next.js application error shell", async ({ page }) => {
  await page.addInitScript((state) => {
    window.localStorage.setItem("render-auth", JSON.stringify(state));
  }, authState);

  await page.route("**/listings/my", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ listings: [] })
    });
  });

  await page.goto("/dashboard/listings");

  await expect(page.getByText("No listings yet")).toBeVisible();
  await expect(page.getByText("Application error")).toHaveCount(0);
  await expect(page.getByText("server-side exception")).toHaveCount(0);
  await expect(page.getByText("Digest")).toHaveCount(0);
});
