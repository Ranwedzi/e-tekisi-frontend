import { expect, test } from "@playwright/test";

const email = process.env.E2E_OPS_EMAIL;
const password = process.env.E2E_OPS_PASSWORD;

test("an operator signs in through the staff link and lands on /ops", async ({ page }) => {
  test.skip(!email || !password, "Set E2E_OPS_EMAIL and E2E_OPS_PASSWORD (the backend's ADMIN_BOOTSTRAP_* account).");
  await page.goto("/login");
  await page.getByRole("button", { name: "e-Tekisi staff? Sign in here" }).click();
  await expect(page.getByText("Operator sign-in")).toBeVisible();
  await page.getByLabel("Email address").fill(email!);
  await page.getByLabel("Password", { exact: true }).fill(password!);
  await page.getByRole("button", { name: "LOGIN" }).click();

  await expect(page).toHaveURL(/\/ops/);
  await expect(page.getByRole("heading", { name: "Operations" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Payouts" })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Safety alerts" }).click();
  await expect(page.getByText(/No critical alerts|SAFETY PANIC|Safety panic/i).first()).toBeVisible();
});
