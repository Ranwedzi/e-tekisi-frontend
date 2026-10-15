import { expect, test } from "@playwright/test";
import { runId, signIn, signUpCommuter } from "./helpers";

test("signed-out visitors are sent to the login page", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
  await page.goto("/driver/earnings");
  await expect(page).toHaveURL(/\/login/);
});

test("a wrong password shows an error and stays on login", async ({ page, request }) => {
  const email = `e2e-auth-${runId()}@example.test`;
  await signUpCommuter(request, email);
  await signIn(page, email, "COMMUTER", "not-the-password");
  // (Next.js also renders an empty role="alert" route announcer, so match the text.)
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await expect(page).toHaveURL(/\/login/);
});

test("driver sign-up asks for the licence number before submitting", async ({ page }) => {
  await page.goto("/register");
  await page.getByRole("radio", { name: "Driver" }).click();
  await page.getByLabel("Full Name").fill("No Licence");
  await page.getByLabel("Email").fill(`e2e-nolicence-${runId()}@example.test`);
  await page.getByLabel("Phone Number").fill("0820000999");
  await page.getByLabel("Taxi Plate (e.g. GP123ABC)").fill("gp 123-abc");
  await page.getByLabel("Password", { exact: true }).fill("E2e-Password-1");
  await page.getByLabel("Confirm Password").fill("E2e-Password-1");
  await page.getByRole("button", { name: /REGISTER NOW/ }).click();
  await expect(page.getByText("Enter your driver's licence number.")).toBeVisible();
  await expect(page).toHaveURL(/\/register/);
});

test("a commuter can't open driver or operator screens", async ({ page, request }) => {
  const email = `e2e-guard-${runId()}@example.test`;
  await signUpCommuter(request, email);
  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL("/");
  await page.goto("/driver");
  await expect(page).toHaveURL("/");
  await page.goto("/ops");
  await expect(page).toHaveURL("/");
});
