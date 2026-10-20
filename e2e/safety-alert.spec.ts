import { expect, test } from "@playwright/test";
import { API, OPS_EMAIL, OPS_PASSWORD, PASSWORD, runId, signUpCommuter } from "./helpers";

test("a commuter's panic alert shows on /ops until an operator acknowledges it", async ({ page, request }) => {
  test.skip(!OPS_EMAIL || !OPS_PASSWORD, "Needs E2E_OPS_EMAIL / E2E_OPS_PASSWORD.");
  const email = `e2e-panic-${runId()}@example.test`;
  await signUpCommuter(request, email);
  const login = await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD, role: "COMMUTER" } });
  const { token } = await login.json();
  const headers = { Authorization: `Bearer ${token}` };
  const created = await request.post(`${API}/api/bookings/create`, {
    headers,
    data: { pickupLocation: "Bree Taxi Rank", destination: "Soweto" },
  });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { bookingId } = await created.json();
  const panic = await request.post(`${API}/api/agents/safety/panic?bookingId=${bookingId}`, { headers });
  expect(panic.ok(), await panic.text()).toBeTruthy();

  await page.goto("/login");
  await page.getByRole("button", { name: "e-Tekisi staff? Sign in here" }).click();
  await page.getByLabel("Email address").fill(OPS_EMAIL!);
  await page.getByLabel("Password", { exact: true }).fill(OPS_PASSWORD!);
  await page.getByRole("button", { name: "LOGIN" }).click();
  await expect(page).toHaveURL(/\/ops/);
  await page.getByRole("tab", { name: "Safety alerts" }).click();

  // The alert is written asynchronously; the list polls.
  const card = page.locator("div.rounded-\\[24px\\]").filter({ hasText: `Booking #${bookingId} ` });
  await expect(card).toBeVisible({ timeout: 30_000 });
  await card.getByRole("button", { name: "I'm handling this" }).click();
  await card.getByLabel("What you're doing about it").fill("Calling the commuter now");
  await card.getByRole("button", { name: "Acknowledge" }).click();
  await expect(page.getByText("Alert acknowledged.")).toBeVisible();
  await expect(card).toBeHidden();

  await page.getByRole("button", { name: "All", exact: true }).click();
  await expect(card).toContainText("Calling the commuter now");
  await expect(card).toContainText("Acknowledged by operator #");
});
