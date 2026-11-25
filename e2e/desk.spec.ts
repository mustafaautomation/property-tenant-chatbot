import { expect, test } from "@playwright/test"
import fs from "fs"

test.beforeAll(() => {
  fs.mkdirSync("docs/screenshots", { recursive: true })
})

test("landing explains the desk", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /resident desk for three buildings/i })).toBeVisible()
  await expect(page.getByRole("contentinfo").getByText("Portfolio demo by Quvantic")).toBeVisible()
  await expect(page.getByText("How a message moves")).toBeVisible()
  await page.screenshot({ path: "docs/screenshots/landing.png", fullPage: true })
})

test("a notes question shows a citation", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("composer-input").fill("What are quiet hours on Sunday?")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-messages")).toContainText("9:00 a.m.")
  await expect(page.getByTestId("chat-messages")).toContainText("Source:")
})

test("verify, leaking sink, then status", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("composer-input").fill("I'm in unit 4B, last name Chen")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-messages")).toContainText("Maya Chen")
  await page.getByTestId("composer-input").fill("my kitchen sink is leaking")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-messages")).toContainText(/KR-\d+/)
  await expect(page.getByTestId("chat-messages")).toContainText(/urgent/i)
  await page.getByTestId("composer-input").fill("what's the status of that ticket?")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-messages")).toContainText("open")
  await expect(page.getByTestId("phase-indicator")).toBeHidden()
  await page.screenshot({ path: "docs/screenshots/chat.png" })
})

test("a request for a person hands off", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("composer-input").fill("I want to talk to a person")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-messages")).toContainText(/coordinator/i)
})

test("the embed launcher opens the desk", async ({ page }) => {
  await page.goto("/embed-demo")
  await page.getByTestId("chat-launcher").click()
  const frame = page.frameLocator("[data-testid='desk-frame']")
  await expect(frame.getByTestId("composer-input")).toBeVisible()
  await page.screenshot({ path: "docs/screenshots/widget.png" })
})

test("staff board shows the kanban", async ({ page }) => {
  await page.goto("/admin")
  await page.getByTestId("desk-password").fill("keystone-demo")
  await page.getByRole("button", { name: "Enter the desk" }).click()
  await expect(page.getByRole("heading", { name: "Maintenance board" })).toBeVisible()
  await page.screenshot({ path: "docs/screenshots/admin.png" })
})

test("mobile chat keeps the composer usable", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto("/chat")
  await expect(page.getByTestId("composer-input")).toBeVisible()
  await expect(page.getByTestId("quick-replies")).toBeVisible()
  await page.getByTestId("composer-input").fill("What are quiet hours on Sunday?")
  await page.getByTestId("composer-send").click()
  await expect(page.getByTestId("chat-messages")).toContainText("9:00 a.m.")
  await expect(page.getByTestId("phase-indicator")).toBeHidden()
  await page.screenshot({ path: "docs/screenshots/chat-mobile.png" })
})
