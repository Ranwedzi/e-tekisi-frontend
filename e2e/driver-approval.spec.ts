import { expect, test } from "@playwright/test";
import { approveDriver, OPS_EMAIL, OPS_PASSWORD, runId, signIn, signUpDriver } from "./helpers";

test("a new driver waits for approval before going online", async ({ page, request }) => {
  test.skip(!OPS_EMAIL || !OPS_PASSWORD, "Needs E2E_OPS_EMAIL / E2E_OPS_PASSWORD to approve the driver.");
  const id = runId();
  const email = `e2e-vet-${id}@example.test`;
  await signUpDriver(request, email, `VET${id.slice(-6)}`);

  await signIn(page, email, "DRIVER");
  await expect(page.getByText("Your account is being checked")).toBeVisible();
  await expect(page.getByRole("button", { name: "GO ONLINE" })).toBeDisabled();

  await approveDriver(request, email);
  await page.reload();
  await expect(page.getByText("Your account is being checked")).toBeHidden();
  await page.getByRole("button", { name: "GO ONLINE" }).click();
  await expect(page.getByRole("button", { name: "YOU ARE ONLINE" })).toBeVisible();
});
