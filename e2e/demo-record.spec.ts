import { expect, test } from "@playwright/test"

test.use({ video: "on" })

test("record the resident flow", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /three buildings/i })).toBeVisible()
  await page.goto("/chat")
  await page.getByTestId("chat-input").fill("I'm in unit 4B, last name Chen")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText("Maya Chen")
  await page.getByTestId("chat-input").fill("my kitchen sink is leaking")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText(/urgent/i)
  await page.waitForTimeout(600)
})
