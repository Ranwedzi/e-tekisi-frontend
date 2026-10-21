import { expect, test } from "@playwright/test";
import { runId, signUpCommuter } from "./helpers";

test("the app speaks the commuter's language and remembers it", async ({ page, request }) => {
  await page.goto("/login");
  // Retried: a choice made before the page has hydrated doesn't stick.
  await expect(async () => {
    await page.getByRole("combobox").selectOption("zu");
    await expect(page.getByRole("heading", { name: "Siyakwamukela futhi" })).toBeVisible({ timeout: 1000 });
  }).toPass();
  await expect(page.locator("html")).toHaveAttribute("lang", "zu-ZA");

  // The choice is kept on this phone.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Siyakwamukela futhi" })).toBeVisible();

  // Signed in, in Afrikaans this time.
  await page.getByLabel("Ulimi").selectOption("af");
  const email = `e2e-lang-${runId()}@example.test`;
  await signUpCommuter(request, email, "Anele Taal");
  await page.getByLabel("E-posadres").fill(email);
  await page.getByLabel("Wagwoord", { exact: true }).fill("E2e-Password-1");
  await page.getByRole("button", { name: "TEKEN AAN" }).click();
  await expect(page.getByText("Hallo!")).toBeVisible();
  await expect(page.getByRole("button", { name: "Vra 'n taxi" })).toBeVisible();

  // Messages are translated too: a request with no pick-up point.
  await page.getByRole("button", { name: "Vra 'n taxi" }).click();
  await expect(page.getByText("Voer 'n oplaaiplek en 'n bestemming in.")).toBeVisible();

  // Back to English from the profile.
  await page.goto("/profile");
  await page.getByRole("combobox").selectOption("en");
  await expect(page.getByRole("heading", { name: "Profile" })).toBeVisible();
});
