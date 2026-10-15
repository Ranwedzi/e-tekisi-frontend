import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const API = process.env.E2E_API_URL ?? "http://localhost:8080";
export const PASSWORD = "E2e-Password-1";

/** A run-unique suffix so tests never collide with earlier data in the same database. */
export const runId = () => `${Date.now()}${Math.floor(Math.random() * 100)}`;

export async function signUpCommuter(request: APIRequestContext, email: string, fullName = "E2E Commuter") {
  const res = await request.post(`${API}/api/auth/register/commuter`, {
    data: { fullName, email, phoneNumber: "0710000123", password: PASSWORD },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

export async function signUpDriver(request: APIRequestContext, email: string, plate: string, fullName = "E2E Driver") {
  const res = await request.post(`${API}/api/auth/register/driver`, {
    data: { fullName, email, phoneNumber: "0820000123", taxiPlate: plate, licenseNumber: "E2E-LIC", password: PASSWORD },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
}

export async function signIn(page: Page, email: string, role: "COMMUTER" | "DRIVER", password = PASSWORD) {
  await page.goto("/login");
  if (role === "DRIVER") await page.getByRole("radio", { name: "DRIVER" }).click();
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "LOGIN" }).click();
}
