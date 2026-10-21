import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:8080";
export const PASSWORD = "E2e-Password-1";

/** A run-unique suffix so tests never collide with earlier data in the same database. */
export const runId = () => `${Date.now()}${Math.floor(Math.random() * 100)}`;

/** Mailpit (docker compose) catches the backend's emails; its API is how tests read them. */
export const MAILPIT = process.env.E2E_MAILPIT_URL ?? "http://localhost:8025";

async function termsVersion(request: APIRequestContext): Promise<string> {
  const res = await request.get(`${API}/api/legal`);
  expect(res.ok(), "GET /api/legal").toBeTruthy();
  return (await res.json()).version;
}

/** The newest email to `to` that links to `/page?token=...`; returns the token. Waits for delivery. */
export async function emailToken(request: APIRequestContext, to: string, page: string): Promise<string> {
  for (let i = 0; i < 40; i++) {
    const search = await request.get(`${MAILPIT}/api/v1/search`, { params: { query: `to:"${to}"` } });
    if (search.ok()) {
      for (const m of (await search.json()).messages ?? []) {
        const full = await (await request.get(`${MAILPIT}/api/v1/message/${m.ID}`)).json();
        const match = new RegExp(`/${page}\\?token=([A-Za-z0-9_-]+)`).exec(full.Text ?? "");
        if (match) return match[1];
      }
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`No ${page} email to ${to} in Mailpit (${MAILPIT}). Is the mailpit service running?`);
}

/** Clicks the verification link, as the person would. */
export async function verifyEmail(request: APIRequestContext, email: string) {
  const token = await emailToken(request, email.toLowerCase(), "verify-email");
  const res = await request.post(`${API}/api/auth/verify-email`, { data: { token } });
  expect(res.ok(), await res.text()).toBeTruthy();
}

/** Signs up a commuter who accepted the terms and (unless `verify` is false) confirmed their email. */
export async function signUpCommuter(request: APIRequestContext, email: string, fullName = "E2E Commuter", verify = true) {
  const res = await request.post(`${API}/api/auth/register/commuter`, {
    data: { fullName, email, phoneNumber: "0710000123", password: PASSWORD, acceptTerms: true, termsVersion: await termsVersion(request) },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  if (verify) await verifyEmail(request, email);
}

export async function signUpDriver(request: APIRequestContext, email: string, plate: string, fullName = "E2E Driver", verify = true) {
  const res = await request.post(`${API}/api/auth/register/driver`, {
    data: {
      fullName, email, phoneNumber: "0820000123", taxiPlate: plate, licenseNumber: "E2E-LIC", password: PASSWORD,
      acceptTerms: true, termsVersion: await termsVersion(request),
    },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
  if (verify) await verifyEmail(request, email);
}

export const OPS_EMAIL = process.env.E2E_OPS_EMAIL;
export const OPS_PASSWORD = process.env.E2E_OPS_PASSWORD;

/** A tiny file that passes the backend's PDF check. */
export const TEST_PDF = Buffer.from("%PDF-1.4\n% e-Tekisi e2e test document\n%%EOF\n");

const REQUIRED_DOCUMENTS = ["DRIVERS_LICENCE", "PRDP", "OPERATING_LICENCE"];

export async function bearer(request: APIRequestContext, email: string, password: string, role: string) {
  const login = await request.post(`${API}/api/auth/login`, { data: { email, password, role } });
  expect(login.ok(), `${role} login for ${email}`).toBeTruthy();
  return { Authorization: `Bearer ${(await login.json()).token}` };
}

/**
 * New drivers can't take trips until approved. Does what they and an operator
 * would: the driver uploads the required documents, the operator accepts each
 * one on /ops and approves the account.
 */
export async function approveDriver(request: APIRequestContext, driverEmail: string) {
  const driverHeaders = await bearer(request, driverEmail, PASSWORD, "DRIVER");
  const nextYear = `${new Date().getFullYear() + 1}-12-31`;
  for (const type of REQUIRED_DOCUMENTS) {
    const up = await request.post(`${API}/api/me/documents`, {
      headers: driverHeaders,
      multipart: { type, expiresOn: nextYear, file: { name: `${type.toLowerCase()}.pdf`, mimeType: "application/pdf", buffer: TEST_PDF } },
    });
    expect(up.ok(), await up.text()).toBeTruthy();
  }

  expect(OPS_EMAIL && OPS_PASSWORD, "E2E_OPS_EMAIL / E2E_OPS_PASSWORD").toBeTruthy();
  const headers = await bearer(request, OPS_EMAIL!, OPS_PASSWORD!, "OPERATOR");
  const pending = await (await request.get(`${API}/api/ops/drivers`, { headers })).json();
  const driver = pending.find((d: { email: string }) => d.email === driverEmail.toLowerCase());
  expect(driver, `pending driver ${driverEmail}`).toBeTruthy();
  const docs = await (await request.get(`${API}/api/ops/drivers/${driver.id}/documents`, { headers })).json();
  for (const doc of docs.items.filter((d: { status: string }) => d.status === "SUBMITTED")) {
    const ok = await request.put(`${API}/api/ops/documents/${doc.id}/accept`, { headers, data: {} });
    expect(ok.ok(), await ok.text()).toBeTruthy();
  }
  const res = await request.put(`${API}/api/ops/drivers/${driver.id}/approve`, { headers });
  expect(res.ok(), await res.text()).toBeTruthy();
}

export async function signIn(page: Page, email: string, role: "COMMUTER" | "DRIVER", password = PASSWORD) {
  await page.goto("/login");
  if (role === "DRIVER") await page.getByRole("radio", { name: "DRIVER" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
}
