import { expect, test } from "@playwright/test";
import { emailToken, PASSWORD, runId, signIn, signUpCommuter } from "./helpers";

test("sign-up needs consent, then the emailed link verifies the account", async ({ page, request }) => {
  const email = `e2e-verify-${runId()}@example.test`;
  await page.goto("/register");
  await page.getByLabel("Full Name").fill("Naledi Verify");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Phone Number").fill("0820000444");
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm Password").fill(PASSWORD);
  await page.getByRole("button", { name: /REGISTER NOW/ }).click();
  await expect(page.getByText("Please accept the terms to create your account.")).toBeVisible();

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: /REGISTER NOW/ }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);

  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Verify your account to book and pay")).toBeVisible();

  const token = await emailToken(request, email, "verify-email");
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByRole("heading", { name: "Email confirmed" })).toBeVisible();
  // The token is taken out of the address bar.
  await expect(page).toHaveURL(/\/verify-email$/);
  await page.getByRole("link", { name: "Continue" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText("Verify your account to book and pay")).toBeHidden();
});

test("forgot password: the emailed link sets a new one", async ({ page, request }) => {
  const email = `e2e-reset-${runId()}@example.test`;
  await signUpCommuter(request, email);

  await page.goto("/login");
  await page.getByRole("link", { name: "Forgot password?" }).click();
  await page.waitForLoadState("networkidle"); // hydrated, so typing reaches React state
  await page.getByLabel("Email address").fill(email);
  await page.getByRole("button", { name: "CONTINUE" }).click();
  await expect(page.getByRole("heading", { name: "Check your email" })).toBeVisible();

  const token = await emailToken(request, email, "reset-password");
  await page.goto(`/reset-password?token=${token}`);
  await page.getByLabel("New password", { exact: true }).fill("violet-harbour-77");
  await page.getByLabel("Confirm new password").fill("violet-harbour-77");
  await page.getByRole("button", { name: "SAVE PASSWORD" }).click();
  await expect(page).toHaveURL(/\/login\?reason=reset/);
  await expect(page.getByText("Password changed. Sign in with your new password.")).toBeVisible();

  await signIn(page, email, "COMMUTER", PASSWORD);
  await expect(page.getByText("Invalid email or password.")).toBeVisible();
  await signIn(page, email, "COMMUTER", "violet-harbour-77");
  await expect(page).toHaveURL("/");
});
