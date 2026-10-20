import { expect, test } from "@playwright/test";
import { approveDriver, OPS_EMAIL, OPS_PASSWORD, runId, signIn, signUpDriver, TEST_PDF } from "./helpers";

test("a new driver waits for approval before going online", async ({ page, request }) => {
  test.skip(!OPS_EMAIL || !OPS_PASSWORD, "Needs E2E_OPS_EMAIL / E2E_OPS_PASSWORD to approve the driver.");
  const id = runId();
  const email = `e2e-vet-${id}@example.test`;
  await signUpDriver(request, email, `VET${id.slice(-6)}`);

  await signIn(page, email, "DRIVER");
  await expect(page.getByText("Your account is being checked")).toBeVisible();
  await expect(page.getByRole("button", { name: "GO ONLINE" })).toBeDisabled();

  // The driver photographs their licence on the documents page.
  await page.getByRole("link", { name: "My documents" }).click();
  const licence = page.getByRole("region", { name: "Driver's licence" });
  await licence.getByLabel("Choose Driver's licence file").setInputFiles({ name: "licence.pdf", mimeType: "application/pdf", buffer: TEST_PDF });
  await licence.getByRole("button", { name: "Upload" }).click();
  await expect(licence.getByText("Waiting for review")).toBeVisible();
  await page.getByRole("link", { name: "Back" }).click();

  await approveDriver(request, email);
  await page.reload();
  await expect(page.getByText("Your account is being checked")).toBeHidden();
  await page.getByRole("button", { name: "GO ONLINE" }).click();
  await expect(page.getByRole("button", { name: "YOU ARE ONLINE" })).toBeVisible();
});
