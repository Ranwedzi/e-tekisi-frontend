import { expect, test } from "@playwright/test";
import { approveDriver, OPS_EMAIL, OPS_PASSWORD, runId, signIn, signUpCommuter, signUpDriver } from "./helpers";

/**
 * The whole money path, as two people on two phones:
 * commuter tops up and requests a ride → driver offers a fare → commuter
 * accepts (and is charged) → driver completes (and is credited) → driver
 * requests a payout.
 */
test("commuter books, driver offers, commuter accepts, driver completes and cashes out", async ({ browser, request }) => {
  test.skip(!OPS_EMAIL || !OPS_PASSWORD, "Needs E2E_OPS_EMAIL / E2E_OPS_PASSWORD to approve the new driver.");
  const id = runId();
  const commuterEmail = `e2e-c-${id}@example.test`;
  const driverEmail = `e2e-d-${id}@example.test`;
  const pickup = `E2E Rank ${id}`;
  await signUpCommuter(request, commuterEmail);
  await signUpDriver(request, driverEmail, `E2E${id.slice(-6)}`);
  await approveDriver(request, driverEmail);

  // Separate browser contexts = separate phones (separate sign-ins).
  const commuterCtx = await browser.newContext();
  // Capture what the phone's share sheet would receive.
  await commuterCtx.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: async (data: ShareData) => {
        (window as unknown as { __shared?: ShareData }).__shared = data;
      },
    });
  });
  const c = await commuterCtx.newPage();
  const driverCtx = await browser.newContext({
    geolocation: { latitude: -26.2041, longitude: 28.0473 },
    permissions: ["geolocation"],
  });
  const d = await driverCtx.newPage();

  // --- Commuter: sign in, top up R100, request a ride.
  await signIn(c, commuterEmail, "COMMUTER");
  await expect(c.getByText("E2E Commuter")).toBeVisible();
  await c.goto("/wallet");
  await c.getByRole("button", { name: "R100", exact: true }).click();
  await c.getByRole("button", { name: "CONFIRM TOP-UP" }).click();
  await expect(c.getByText("R100.00 added to your wallet.")).toBeVisible();

  await c.goto("/");
  await c.getByLabel("Pick-up point").fill(pickup);
  await c.getByLabel("Destination").fill("E2E Destination");
  await c.getByRole("button", { name: "Request Taxi" }).click();
  await expect(c.getByText("Looking for a driver")).toBeVisible();

  // --- Driver: sign in, go online, offer R30 on this request.
  await signIn(d, driverEmail, "DRIVER");
  await d.getByRole("button", { name: "GO ONLINE" }).click();
  await expect(d.getByRole("button", { name: "YOU ARE ONLINE" })).toBeVisible();
  const card = d
    .locator("div")
    .filter({ hasText: pickup })
    .filter({ has: d.getByRole("button", { name: "Offer fare" }) })
    .last();
  await card.getByRole("button", { name: "Offer fare" }).click();
  await d.getByLabel("Fare (R)").fill("30");
  await d.getByRole("button", { name: "Send offer" }).click();
  await expect(d.getByText(/Offer of R30\.00 sent/)).toBeVisible();

  // Nothing is charged yet.
  await c.goto("/wallet");
  await expect(c.getByRole("heading", { name: "100.00" })).toBeVisible();

  // --- Commuter: sees the offer and accepts it.
  await c.goto("/");
  await expect(c.getByText("Fare offer")).toBeVisible({ timeout: 15_000 });
  await expect(c.getByText("E2E Driver")).toBeVisible();
  await c.getByRole("button", { name: "Accept & pay" }).click();
  await expect(c.getByText("Offer accepted. R30.00 paid from your wallet.")).toBeVisible();
  await expect(c.getByText("Driver on the way")).toBeVisible();

  // --- Commuter: shares the trip; someone at home follows it without signing in.
  await c.getByRole("button", { name: "Share my trip" }).click();
  await expect(c.getByRole("button", { name: "Stop sharing" })).toBeVisible();
  const sharedUrl = await c.evaluate(() => (window as unknown as { __shared?: ShareData }).__shared?.url);
  expect(sharedUrl).toMatch(/\/share\/[A-Za-z0-9_-]+$/);
  const viewerCtx = await browser.newContext();
  const v = await viewerCtx.newPage();
  await v.goto(sharedUrl!);
  await expect(v.getByText("Live trip")).toBeVisible();
  await expect(v.getByText(`E2E${id.slice(-6)}`)).toBeVisible();
  await expect(v.getByText("Driver: E2E")).toBeVisible();

  // --- Driver: the job is active; complete it.
  await expect(d.getByText(/Active Job/)).toBeVisible({ timeout: 15_000 });
  await d.getByRole("button", { name: "Complete Trip" }).click();
  await d.getByRole("button", { name: "Complete", exact: true }).click();
  await expect(d.getByText("Trip completed. R30.00 added to your balance.")).toBeVisible();

  // The shared page now only says the trip is over.
  await v.reload();
  await expect(v.getByRole("heading", { name: /trip is finished/ })).toBeVisible();
  await expect(v.getByText(`E2E${id.slice(-6)}`)).toBeHidden();
  await viewerCtx.close();

  // --- Driver: cash out R20 to an FNB eWallet.
  await d.goto("/driver/earnings");
  await expect(d.getByRole("heading", { name: "30.00" })).toBeVisible();
  await d.getByRole("button", { name: "Request Payout" }).click();
  await d.getByLabel("Payout method").selectOption("FNB_EWALLET");
  await d.getByLabel("Amount").fill("20");
  await d.getByLabel("Phone number").fill("0820000123");
  await d.getByRole("button", { name: "Request", exact: true }).click();
  await expect(d.getByText("Payout of R20.00 requested.")).toBeVisible();
  await expect(d.getByRole("heading", { name: "10.00" })).toBeVisible();

  // --- Commuter: wallet shows the R30 fare was taken exactly once.
  await c.goto("/wallet");
  await expect(c.getByRole("heading", { name: "70.00" })).toBeVisible();

  await commuterCtx.close();
  await driverCtx.close();
});
