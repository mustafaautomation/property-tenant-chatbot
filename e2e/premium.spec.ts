import { expect, test } from "@playwright/test"

test("shows the teaser, demo pill, follow-ups, and message actions", async ({ page }) => {
  await page.goto("/embed-demo")
  await expect(page.getByTestId("launcher-teaser")).toContainText("Heater acting up", { timeout: 8000 })
  await page.getByTestId("chat-launcher").click()
  const frame = page.frameLocator("[data-testid='desk-frame']")
  await expect(frame.getByTestId("mode-pill")).toHaveText(/Demo mode/)
  await frame.getByTestId("composer-input").fill("What's the package policy?")
  await frame.getByTestId("composer-send").click()
  await expect(frame.getByTestId("follow-up").first()).toBeVisible()
  await expect(frame.getByRole("button", { name: "Copy" })).toBeVisible()
  await expect(frame.getByRole("button", { name: "Regenerate" })).toBeVisible()
  await expect(frame.getByTestId("citation-chip").first()).toBeVisible()
})

test("offers only returned booking times and a lead card", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("composer-input").fill("Book the rooftop lounge")
  await page.getByTestId("composer-send").click()
  await expect(page.getByText("Only times the booking system returned")).toBeVisible()
  await expect(page.getByTestId("slot-chip").first()).toBeVisible()
  await page.getByTestId("lead-link").click()
  await expect(page.getByTestId("card-lead")).toBeVisible()
})

test("handoff can resume the assistant from the board", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("composer-input").fill("I want to talk to a person")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-subtitle")).toContainText(/Amina Rahman|human|Connecting/)
  await page.goto("/admin")
  await page.getByTestId("desk-password").fill("keystone-demo")
  await page.getByRole("button", { name: "Enter the desk" }).click()
  await page.getByRole("tab", { name: "Conversations" }).click()
  await expect(page.getByTestId("resume-bot").first()).toBeVisible()
  await page.getByTestId("resume-bot").first().click()
  await expect(page.getByText(/Handoff|coordinator|Resident|Unverified/).first()).toBeVisible()
})
