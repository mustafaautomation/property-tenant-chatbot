import { expect, test } from "@playwright/test"
import fs from "fs"

test.beforeAll(() => {
  fs.mkdirSync("docs/screenshots", { recursive: true })
})

test("landing explains the desk", async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: /resident desk for three buildings/i })).toBeVisible()
  await expect(page.getByText("Portfolio demo by Quvantic")).toBeVisible()
  await expect(page.getByText("How a message moves")).toBeVisible()
  await page.screenshot({ path: "docs/screenshots/landing.png", fullPage: true })
})

test("a notes question shows a citation", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("chat-input").fill("What are quiet hours on Sunday?")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText("9:00 a.m.")
  await expect(page.getByTestId("message-list")).toContainText("Source:")
})

test("verify, leaking sink, then status", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("chat-input").fill("I'm in unit 4B, last name Chen")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText("Maya Chen")
  await page.getByTestId("chat-input").fill("my kitchen sink is leaking")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText(/KR-\d+/)
  await expect(page.getByTestId("message-list")).toContainText(/urgent/i)
  await page.getByTestId("chat-input").fill("what's the status of that ticket?")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText("open")
  await page.screenshot({ path: "docs/screenshots/chat.png" })
})

test("a request for a person hands off", async ({ page }) => {
  await page.goto("/chat")
  await page.getByTestId("chat-input").fill("I want to talk to a person")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText(/coordinator/i)
})

test("the embed launcher opens the desk", async ({ page }) => {
  await page.goto("/embed-demo")
  await page.getByTestId("launcher").click()
  const frame = page.frameLocator("[data-testid='desk-frame']")
  await expect(frame.getByTestId("chat-input")).toBeVisible()
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
  await expect(page.getByTestId("chat-input")).toBeVisible()
  await expect(page.getByTestId("quick-replies")).toBeVisible()
  await page.getByTestId("chat-input").fill("What are quiet hours on Sunday?")
  await page.getByTestId("chat-send").click()
  await expect(page.getByTestId("message-list")).toContainText("9:00 a.m.")
  await page.screenshot({ path: "docs/screenshots/chat-mobile.png" })
})
