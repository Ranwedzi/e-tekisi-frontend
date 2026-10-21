import { expect, test } from "@playwright/test";
import { runId, signIn, signUpCommuter } from "./helpers";

test("the session lives in httpOnly cookies and renews itself", async ({ page, context, request }) => {
  const email = `e2e-session-${runId()}@example.test`;
  await signUpCommuter(request, email, "Sipho Cookie");
  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL(/\/$/);

  // Nothing a script on the page could steal.
  const stored = await page.evaluate(() => window.localStorage.getItem("etekisi_session") ?? "");
  expect(stored).not.toContain("token");
  expect(await page.evaluate(() => document.cookie)).not.toContain("tekisi");
  const cookies = await context.cookies();
  const access = cookies.find((c) => c.name === "__Host-tekisi_at");
  const refresh = cookies.find((c) => c.name === "__Secure-tekisi_rt");
  expect(access?.httpOnly).toBe(true);
  expect(access?.sameSite).toBe("Strict");
  expect(refresh?.httpOnly).toBe(true);
  expect(refresh?.path).toBe("/api/auth/session");

  // The 15-minute access cookie runs out: the next call renews it without bothering the user.
  await context.clearCookies({ name: "__Host-tekisi_at" });
  await page.goto("/profile");
  await expect(page.getByRole("heading", { name: "Sipho Cookie" })).toBeVisible();
  expect((await context.cookies()).some((c) => c.name === "__Host-tekisi_at")).toBeTruthy();
  await expect(page.getByText("Chrome on Android")).toBeVisible();

  // Sign out everywhere: this browser too, and its refresh cookie no longer works.
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await page.getByRole("button", { name: "Sign out everywhere" }).click();
  await expect(page).toHaveURL(/\/login\?reason=everywhere/);
  await expect(page.getByText("Signed out on all your devices.")).toBeVisible();
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
});

test("a session saved by the old version (token in storage) is signed out", async ({ page }) => {
  await page.goto("/login");
  await page.evaluate(() =>
    window.localStorage.setItem(
      "etekisi_session",
      JSON.stringify({ token: "old.jwt.token", userId: 1, role: "COMMUTER", expiresAt: Date.now() + 3_600_000 }),
    ),
  );
  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login/);
  expect(await page.evaluate(() => window.localStorage.getItem("etekisi_session"))).toBeNull();
});
