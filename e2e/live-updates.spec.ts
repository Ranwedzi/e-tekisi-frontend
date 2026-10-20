import { expect, test } from "@playwright/test";
import { API, approveDriver, OPS_EMAIL, OPS_PASSWORD, PASSWORD, runId, signIn, signUpCommuter, signUpDriver } from "./helpers";

/**
 * A fare offer shows up on the commuter's screen straight away, pushed over
 * the live-event stream. With the stream up, polling slows to 30 s, so seeing
 * it within a few seconds proves the push path works.
 */
test("a driver's offer appears on the commuter's screen within seconds", async ({ page, request }) => {
  test.skip(!OPS_EMAIL || !OPS_PASSWORD, "Needs E2E_OPS_EMAIL / E2E_OPS_PASSWORD to approve the driver.");
  const id = runId();
  const commuterEmail = `e2e-live-c-${id}@example.test`;
  const driverEmail = `e2e-live-d-${id}@example.test`;
  await signUpCommuter(request, commuterEmail);
  await signUpDriver(request, driverEmail, `LIV${id.slice(-6)}`);
  await approveDriver(request, driverEmail);

  const login = async (email: string, role: string) =>
    (await (await request.post(`${API}/api/auth/login`, { data: { email, password: PASSWORD, role } })).json()) as {
      token: string;
      userId: number;
    };
  const commuter = await login(commuterEmail, "COMMUTER");
  const driver = await login(driverEmail, "DRIVER");
  const c = { Authorization: `Bearer ${commuter.token}` };
  const d = { Authorization: `Bearer ${driver.token}` };

  const created = await request.post(`${API}/api/bookings/create`, { headers: c, data: { pickupLocation: `Live rank ${id}`, destination: "Bara" } });
  expect(created.ok(), await created.text()).toBeTruthy();
  const { bookingId } = await created.json();

  const stream = page.waitForRequest((r) => r.url().endsWith("/api/events"));
  await signIn(page, commuterEmail, "COMMUTER");
  await expect(page.getByText("Looking for a driver")).toBeVisible();
  await stream;
  await page.waitForTimeout(2_000); // stream connected: polling is now every 30 s

  const online = await request.put(`${API}/api/auth/driver/${driver.userId}/status?active=true`, { headers: d });
  expect(online.ok(), await online.text()).toBeTruthy();
  const offer = await request.put(`${API}/api/bookings/${bookingId}/offer?fare=33`, { headers: d });
  expect(offer.ok(), await offer.text()).toBeTruthy();

  await expect(page.getByText("Fare offer")).toBeVisible({ timeout: 3_000 });
});
