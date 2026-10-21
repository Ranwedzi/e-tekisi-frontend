import { expect, test } from "@playwright/test";
import { runId, signIn, signUpCommuter } from "./helpers";

test("the app is installable and shows an offline page without a connection", async ({ page, context, request }) => {
  const manifest = await (await request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ name: "e-Tekisi", display: "standalone", start_url: "/" });
  for (const icon of manifest.icons as { src: string; sizes: string; purpose: string }[]) {
    const res = await request.get(icon.src);
    expect(res.headers()["content-type"]).toBe("image/png");
  }
  expect(manifest.icons.some((i: { purpose: string }) => i.purpose === "maskable")).toBeTruthy();

  await page.goto("/login");
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute("href", "/manifest.webmanifest");
  // The service worker takes control of the page once it's installed.
  await page.waitForFunction(() => navigator.serviceWorker?.controller !== null, null, { timeout: 15_000 });

  await context.setOffline(true);
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await context.setOffline(false);
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeHidden();
});

test("a commuter is offered notifications, and can say not now", async ({ page, request }) => {
  // A first visit: the browser hasn't asked yet. (Headless Chromium always reports "denied".)
  await page.addInitScript(() => Object.defineProperty(Notification, "permission", { get: () => "default" }));
  const email = `e2e-push-${runId()}@example.test`;
  await signUpCommuter(request, email, "Naledi Push");
  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL(/\/$/);

  const card = page.getByRole("region", { name: "Notifications" });
  await expect(card).toBeVisible();
  await expect(card).toContainText("Know the moment a driver offers you a ride");
  await card.getByRole("button", { name: "Not now" }).click();
  await expect(card).toBeHidden();
  await page.reload();
  await expect(page.getByText("Heita!")).toBeVisible();
  await expect(card).toBeHidden();

  // It can still be turned on later from the profile, per device.
  await page.goto("/profile");
  await expect(page.getByRole("switch", { name: "Push notifications on this device" })).toHaveAttribute("aria-checked", "false");
  await expect(page.getByText("Off for this device.")).toBeVisible();
});
