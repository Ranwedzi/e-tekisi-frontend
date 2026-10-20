import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { PASSWORD, runId, signIn, signUpCommuter } from "./helpers";

test("a commuter can download their data and delete their account", async ({ page, request }) => {
  const email = `e2e-popia-${runId()}@example.test`;
  await signUpCommuter(request, email, "Thandi Popia");
  await signIn(page, email, "COMMUTER");
  await expect(page).toHaveURL(/\/$/);

  await page.goto("/profile");
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download my data" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^e-tekisi-my-data-.*\.json$/);
  const exported = JSON.parse(await readFile(await download.path(), "utf8"));
  expect(exported.profile.email).toBe(email.toLowerCase());

  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.getByLabel("Password").fill("not-my-password");
  await page.getByRole("button", { name: "Delete account" }).click();
  await expect(page.getByText("That password isn't right.")).toBeVisible();

  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Delete account" }).click();
  await expect(page).toHaveURL(/\/login\?reason=deleted/);
  await expect(page.getByText("Your account has been deleted.")).toBeVisible();

  // The old credentials no longer work.
  await signIn(page, email, "COMMUTER");
  await expect(page.getByText("Invalid email or password")).toBeVisible();
});
