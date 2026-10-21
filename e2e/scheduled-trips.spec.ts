import { expect, test } from "@playwright/test";
import { API, PASSWORD, bearer, runId, signIn, signUpCommuter, signUpDriver } from "./helpers";

test("a scheduled trip waits as upcoming, and drivers don't see it yet", async ({ page, request }) => {
  const id = runId();
  const email = `e2e-sched-${id}@example.test`;
  await signUpCommuter(request, email, "Lerato Later");
  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL(/\/$/);

  // Three hours from now, in the phone's own time (what the date-time field shows).
  const at = await page.evaluate(() => {
    const d = new Date(Date.now() + 3 * 3600_000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  });
  await page.goto("/book");
  await page.getByLabel("Pick-up Location").fill("Bree Taxi Rank");
  await page.getByLabel("Destination").fill(`Soweto ${id}`);
  await page.getByLabel("Departure Time").fill(at);
  await expect(page.getByText("We start finding a driver 30 minutes before you leave.")).toBeVisible();
  await page.getByRole("button", { name: "CONFIRM BOOKING" }).click();
  await expect(page.getByText(/Trip booked for/)).toBeVisible();

  await expect(page).toHaveURL(/\/$/);
  const upcoming = page.getByRole("region", { name: "Upcoming trips" });
  await expect(upcoming).toContainText(`Bree Taxi Rank → Soweto ${id}`);
  await expect(upcoming).toContainText("Scheduled for");
  await expect(page.getByText("Looking for a driver")).toBeHidden();

  // Not on any driver's list until 30 minutes before departure.
  const driverEmail = `e2e-sched-driver-${id}@example.test`;
  await signUpDriver(request, driverEmail, `SC${id.slice(-6)}GP`);
  const pending = await (await request.get(`${API}/api/bookings/pending`, { headers: await bearer(request, driverEmail, PASSWORD, "DRIVER") })).json();
  expect(pending.some((b: { destination: string }) => b.destination === `Soweto ${id}`)).toBeFalsy();

  // The commuter can still cancel it.
  await upcoming.getByRole("button", { name: "Cancel trip" }).click();
  await page.getByRole("button", { name: "Cancel ride" }).click();
  await expect(page.getByText("Ride request cancelled.")).toBeVisible();
  await expect(upcoming).toBeHidden();
});

test("a departure less than 15 minutes away is refused", async ({ page, request }) => {
  const email = `e2e-sched-soon-${runId()}@example.test`;
  await signUpCommuter(request, email);
  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL(/\/$/);
  const soon = await page.evaluate(() => {
    const d = new Date(Date.now() + 5 * 60_000);
    const p = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
  });
  await page.goto("/book");
  await page.getByLabel("Pick-up Location").fill("Bree Taxi Rank");
  await page.getByLabel("Destination").fill("Soweto");
  await page.getByLabel("Departure Time").fill(soon);
  await page.getByRole("button", { name: "CONFIRM BOOKING" }).click();
  await expect(page.getByText("Choose a time at least 15 minutes from now, or request a taxi now.")).toBeVisible();
});
