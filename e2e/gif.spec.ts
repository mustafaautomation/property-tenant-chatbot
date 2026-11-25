import { expect, test } from "@playwright/test"

test.skip(!process.env.RECORD_GIF, "records docs/demo.gif locally")
test.use({ video: "on", viewport: { width: 1280, height: 800 } })

test("record teaser, card, and handoff", async ({ page }) => {
  await page.goto("/embed-demo")
  await expect(page.getByTestId("launcher-teaser")).toBeVisible({ timeout: 8000 })
  await page.waitForTimeout(700)
  await page.getByTestId("chat-launcher").click()
  const frame = page.frameLocator("[data-testid='desk-frame']")
  await frame.getByRole("button", { name: "I need a maintenance ticket" }).click()
  await expect(frame.getByTestId("card-form")).toBeVisible()
  await page.waitForTimeout(600)
  await frame.getByTestId("composer-input").fill("I want to talk to a person")
  await frame.getByTestId("composer-send").click()
  await expect(frame.getByTestId("handoff-banner")).toBeVisible()
  await page.waitForTimeout(900)
})
