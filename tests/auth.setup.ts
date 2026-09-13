import { test as setup } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

Object.assign(process.env, loadEnv("development", process.cwd(), ""));

const authFile = "./auth.json";

setup("authenticate", async ({ page }) => {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const email = "e2e-user@example.com";
  const password = "TestPassword123!";

  if (url && serviceRoleKey) {
    const admin = createClient(url, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: usersData } = await admin.auth.admin.listUsers();
    const existingUser = usersData.users.find((u) => u.email === email);
    if (existingUser) {
      await admin.auth.admin.updateUserById(existingUser.id, { password, email_confirm: true });
    } else {
      await admin.auth.admin.createUser({ email, password, email_confirm: true });
    }
  }

  await page.goto("/auth/signin");
  await page.locator("#email").fill(email);
  await page.locator("#password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();

  await page.waitForURL((url) => url.pathname === "/" || url.pathname === "/recipes");
  await page.context().storageState({ path: authFile });
});
