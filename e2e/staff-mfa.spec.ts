import { createHmac } from "node:crypto";
import { expect, test, type APIRequestContext } from "@playwright/test";
import { API, OPS_EMAIL, OPS_PASSWORD } from "./helpers";

/** RFC 6238 TOTP, as an authenticator app computes it. */
function totp(base32Secret: string, at = Date.now()): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const c of base32Secret.replace(/\s/g, "").toUpperCase()) bits += alphabet.indexOf(c).toString(2).padStart(5, "0");
  const key = Buffer.from(bits.match(/.{8}/g)!.map((b) => parseInt(b, 2)));
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(Math.floor(at / 1000 / 30)));
  const h = createHmac("sha1", key).update(counter).digest();
  const o = h[h.length - 1] & 0x0f;
  return String((h.readUInt32BE(o) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** Leaves the shared operator account as other tests expect it: MFA off. */
async function turnOff(request: APIRequestContext, recoveryForLogin: string, recoveryForDisable: string) {
  const login = await (await request.post(`${API}/api/auth/login`, { data: { email: OPS_EMAIL, password: OPS_PASSWORD, role: "OPERATOR" } })).json();
  if (login.status === "SUCCESS") return; // already off
  const verified = await (await request.post(`${API}/api/auth/mfa/verify`, { data: { mfaToken: login.mfaToken, code: recoveryForLogin } })).json();
  const res = await request.post(`${API}/api/me/mfa/disable`, {
    headers: { Authorization: `Bearer ${verified.token}` },
    data: { code: recoveryForDisable },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

test("an operator turns on two-step sign-in and signs in with it", async ({ page, request }) => {
  test.skip(!OPS_EMAIL || !OPS_PASSWORD, "Needs E2E_OPS_EMAIL / E2E_OPS_PASSWORD.");
  let recovery: string[] = [];
  try {
    await page.goto("/login");
    await page.getByRole("button", { name: "e-Tekisi staff? Sign in here" }).click();
    await page.getByLabel("Email address").fill(OPS_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(OPS_PASSWORD!);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page).toHaveURL(/\/ops/);

    await page.getByRole("tab", { name: "My account" }).click();
    await page.getByRole("button", { name: "Set up two-step sign-in" }).click();
    await expect(page.getByAltText("QR code for your authenticator app")).toBeVisible();
    const secret = (await page.locator("code").innerText()).replace(/\s/g, "");
    await page.getByLabel("Authentication code").fill(totp(secret));
    await page.getByRole("button", { name: "Turn on" }).click();

    const list = page.getByRole("list", { name: "Recovery codes" });
    await expect(list.getByRole("listitem")).toHaveCount(8);
    recovery = await list.getByRole("listitem").allInnerTexts();
    await page.getByRole("button", { name: "I'VE SAVED THEM" }).click();
    await expect(page).toHaveURL(/\/login\?reason=mfa/);

    // Password, then a code (a recovery code here, so the test needn't wait for the next 30-second code).
    await page.getByRole("button", { name: "e-Tekisi staff? Sign in here" }).click();
    await page.getByLabel("Email address").fill(OPS_EMAIL!);
    await page.getByLabel("Password", { exact: true }).fill(OPS_PASSWORD!);
    await page.getByRole("button", { name: "LOGIN" }).click();
    await expect(page.getByRole("heading", { name: "Two-step sign-in" })).toBeVisible();
    await page.getByLabel("Authentication code").fill("000000");
    await page.getByRole("button", { name: "VERIFY" }).click();
    await expect(page.getByText("That code isn't right.", { exact: false })).toBeVisible();
    await page.getByLabel("Authentication code").fill(recovery[0]);
    await page.getByRole("button", { name: "VERIFY" }).click();
    await expect(page).toHaveURL(/\/ops/);
  } finally {
    if (recovery.length >= 3) await turnOff(request, recovery[1], recovery[2]);
  }
});
