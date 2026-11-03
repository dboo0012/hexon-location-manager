import { expect, type Page, test } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SAMPLES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../samples");
const PASSWORD = "password123";

const uniqueEmail = (label: string) =>
  `${label}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}@example.com`;

async function register(page: Page, email = uniqueEmail("user")) {
  await page.goto("/register");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByLabel("Confirm password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/map$/);
  return email;
}

async function addPlace(page: Page, name: string, lat: string, lng: string) {
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Latitude").fill(lat);
  await page.getByLabel("Longitude").fill(lng);
  await page.getByRole("button", { name: "Add to map" }).click();
  await expect(page.getByRole("status")).toHaveText(`Added ${name} to your map.`);
}

const markers = (page: Page) => page.locator(".leaflet-marker-icon");

async function logout(page: Page) {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
}

test.describe("authentication", () => {
  for (const path of ["/map", "/upload"]) {
    test(`redirects signed-out visitors from ${path} to login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    });
  }

  test("register, log out, log back in", async ({ page }) => {
    const email = await register(page);
    await expect(page.getByText(email)).toBeVisible();
    await logout(page);

    await page.goto("/map");
    await expect(page).toHaveURL(/\/login$/);

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByRole("alert")).toHaveText("Invalid email or password");

    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/map$/);
  });
});

test.describe("map", () => {
  test("adds a marker without reloading and shows its name on click", async ({ page }) => {
    await register(page);
    await expect(page.getByText("No places yet")).toBeVisible();

    // A full page reload would wipe this flag.
    await page.evaluate(() => ((window as unknown as { __noReload: boolean }).__noReload = true));
    await addPlace(page, "Suria KLCC", "3.157324409", "101.7121981");

    await expect(markers(page)).toHaveCount(1);
    expect(await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)).toBe(true);

    await page.getByRole("button", { name: "Close popup" }).click().catch(() => {});
    await page.locator(".leaflet-marker-icon[title='Suria KLCC']").click();
    await expect(page.locator(".leaflet-popup-content")).toContainText("Suria KLCC");

    // Saved server-side: still there after a reload.
    await page.reload();
    await expect(markers(page)).toHaveCount(1);
  });

  test("rejects invalid coordinates in the form", async ({ page }) => {
    await register(page);
    await page.getByLabel("Name").fill("Nowhere");
    await page.getByLabel("Latitude").fill("123");
    await page.getByLabel("Longitude").fill("abc");
    await page.getByRole("button", { name: "Add to map" }).click();
    await expect(page.getByText("Latitude must be between -90 and 90.")).toBeVisible();
    await expect(page.getByText(/Longitude must be a decimal number/)).toBeVisible();
    await expect(markers(page)).toHaveCount(0);
  });
});

test("keeps each user's locations private", async ({ page }) => {
  await register(page, uniqueEmail("alice"));
  for (let i = 1; i <= 5; i++) {
    await addPlace(page, `Alice place ${i}`, `3.1${i}`, `101.6${i}`);
  }
  await expect(markers(page)).toHaveCount(5);
  await logout(page);

  await register(page, uniqueEmail("bob"));
  await expect(page.getByText("No places yet")).toBeVisible();
  await expect(markers(page)).toHaveCount(0);
});

test.describe("upload", () => {
  test("shows a confirmation for 3 seconds, then adds every place to the map", async ({ page }) => {
    await register(page);
    await page.getByRole("link", { name: /Upload file/ }).click();

    await page.getByLabel("ZIP file").setInputFiles(path.join(SAMPLES, "valid-locations.zip"));
    await page.getByRole("button", { name: "Upload and add to map" }).click();

    const popup = page.getByRole("status").filter({ hasText: "Upload complete" });
    await expect(popup).toBeVisible();
    const shownAt = Date.now();
    await expect(popup).toContainText("8 places from locations.txt");

    await expect(popup).toBeHidden({ timeout: 5_000 });
    const visibleFor = Date.now() - shownAt;
    expect(visibleFor).toBeGreaterThan(2_500);
    expect(visibleFor).toBeLessThan(4_000);

    await expect(page).toHaveURL(/\/map$/);
    await expect(markers(page)).toHaveCount(8);
  });

  for (const [file, message] of [
    ["invalid-two-files.zip", /exactly one .txt file, but it contains 2 files/],
    ["invalid-text-and-image.zip", /exactly one .txt file/],
    ["invalid-csv-not-txt.zip", /must contain a .txt file/],
    ["invalid-empty.zip", /ZIP file is empty/],
    ["invalid-bad-rows.zip", /3 invalid lines/],
  ] as const) {
    test(`shows an error for 3 seconds for ${file}`, async ({ page }) => {
      await register(page);
      await page.goto("/upload");
      await page.getByLabel("ZIP file").setInputFiles(path.join(SAMPLES, file));
      await page.getByRole("button", { name: "Upload and add to map" }).click();

      const popup = page.getByRole("alert");
      await expect(popup).toContainText("Upload failed");
      const shownAt = Date.now();
      await expect(popup).toContainText(message);
      await expect(popup).toBeHidden({ timeout: 5_000 });
      expect(Date.now() - shownAt).toBeGreaterThan(2_500);

      await expect(page).toHaveURL(/\/upload$/);
      await page.getByRole("link", { name: /Map/ }).click();
      await expect(markers(page)).toHaveCount(0);
    });
  }

  test("rejects a file that is not a ZIP in the browser", async ({ page }) => {
    await register(page);
    await page.goto("/upload");
    await page.getByLabel("ZIP file").setInputFiles(path.join(SAMPLES, "locations.txt"));
    await expect(page.getByRole("alert")).toContainText("is not a .zip file");
  });
});

test("mobile layout: menu opens the sidebar and navigation works @mobile", async ({ page }) => {
  await register(page);
  await page.getByRole("button", { name: "Open menu" }).click();
  await page.getByRole("link", { name: /Upload file/ }).click();
  await expect(page).toHaveURL(/\/upload$/);
  await expect(page.getByRole("heading", { name: "Upload places" })).toBeVisible();
});
