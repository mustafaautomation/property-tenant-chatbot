(function () {
  var script = document.currentScript
  if (!script) {
    var scripts = document.querySelectorAll("script[src*='widget.js']")
    script = scripts[scripts.length - 1] || null
  }
  var origin = (script && script.getAttribute("data-origin")) || window.location.origin
  var position = (script && script.getAttribute("data-position")) || "right"
  var theme = (script && script.getAttribute("data-theme")) || "system"
  var immediate = location.pathname.indexOf("embed-demo") !== -1
  var root = document.createElement("div")
  root.setAttribute("data-keystone-widget", "true")
  var style = document.createElement("style")
  style.textContent = [
    "#keystone-launcher{position:fixed;z-index:2147483000;width:60px;height:60px;border:0;border-radius:999px;background:#C0754A;color:#1A120C;box-shadow:0 8px 24px rgba(192,117,74,.35), inset 0 1px 0 rgba(255,255,255,.25);cursor:pointer;display:grid;place-items:center}",
    "#keystone-launcher:focus-visible{outline:3px solid #243044;outline-offset:3px}",
    "#keystone-launcher:hover{transform:scale(1.06)}",
    "#keystone-stack{position:fixed;z-index:2147483000;display:flex;flex-direction:column;align-items:flex-end;gap:8px}",
    "#keystone-panel{position:fixed;z-index:2147483000;width:400px;height:min(680px,calc(100dvh - 124px));border-radius:24px;overflow:hidden;box-shadow:0 18px 50px rgba(15,18,22,.2);background:#F7F4EE;opacity:0;transform:translateY(18px) scale(.94);pointer-events:none}",
    "#keystone-panel.is-open{opacity:1;transform:none;pointer-events:auto;transition:280ms cubic-bezier(.22,1,.36,1)}",
    ".keystone-pill{height:36px;padding:0 14px;border-radius:999px;border:1px solid #D4CBBB;background:rgba(247,244,238,.92);font:500 13px/36px Geist,ui-sans-serif,system-ui,sans-serif;cursor:pointer}",
    "#keystone-teaser{max-width:240px;padding:8px 10px;border-radius:16px;border:1px solid #D4CBBB;background:#F7F4EE;font:400 13px/1.35 Geist,ui-sans-serif,system-ui,sans-serif;box-shadow:0 8px 24px rgba(15,18,22,.08)}",
    "@media(max-width:639px){#keystone-launcher{width:56px;height:56px}#keystone-panel.is-open{inset:0;width:100dvw;height:100dvh;border-radius:0;box-shadow:none;transform:none}#keystone-launcher.is-hidden{display:none}}",
    "@media(min-width:640px) and (max-width:1023px){#keystone-panel{width:380px}}",
    "@media(prefers-reduced-motion:reduce){#keystone-panel,#keystone-launcher{transition:none!important;transform:none!important}}",
  ].join("")
  document.head.appendChild(style)
  function side(px) {
    return position === "left" ? "left:" + px + "px;right:auto;" : "right:" + px + "px;left:auto;"
  }
  var stack = document.createElement("div")
  stack.id = "keystone-stack"
  stack.style.cssText = side(16) + "bottom:16px;"
  if (window.matchMedia("(min-width:640px)").matches) stack.style.cssText = side(24) + "bottom:24px;"
  var nudges = document.createElement("div")
  nudges.style.cssText = "display:none;flex-direction:column;align-items:flex-end;gap:8px"
  ;["Report a repair", "When is rent due?"].forEach(function (label) {
    var pill = document.createElement("button")
    pill.type = "button"
    pill.className = "keystone-pill"
    pill.setAttribute("data-testid", "launcher-nudge")
    pill.textContent = label
    pill.addEventListener("click", function () {
      openWith(label === "Report a repair" ? "I need a maintenance ticket" : "When is rent due?")
    })
    nudges.appendChild(pill)
  })
  var teaser = document.createElement("div")
  teaser.id = "keystone-teaser"
  teaser.setAttribute("data-testid", "launcher-teaser")
  teaser.hidden = true
  teaser.innerHTML = '<button type="button" aria-label="Dismiss teaser" style="float:right;border:0;background:transparent;cursor:pointer">×</button><button type="button" style="border:0;background:transparent;text-align:left;cursor:pointer;font:inherit">Heater acting up? I can open a ticket today.</button>'
  teaser.querySelector("[aria-label='Dismiss teaser']").addEventListener("click", function () {
    teaser.hidden = true
    try { localStorage.setItem("keystone-teaser-dismissed", "1") } catch { /* ignore */ }
  })
  teaser.querySelectorAll("button")[1].addEventListener("click", function () { openWith("My heater isn't working") })
  var button = document.createElement("button")
  button.id = "keystone-launcher"
  button.type = "button"
  button.setAttribute("data-testid", "chat-launcher")
  button.setAttribute("aria-label", "Open chat with Keystone desk")
  button.setAttribute("aria-expanded", "false")
  button.setAttribute("aria-controls", "keystone-desk-panel")
  button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M4 20V11.2C4 6.9 7.6 3.5 12 3.5s8 3.4 8 7.7V20" stroke="currentColor" stroke-width="2"/><path d="M9.2 20v-4.2a2.8 2.8 0 0 1 5.6 0V20" stroke="currentColor" stroke-width="2"/><path d="M10.2 8.2h3.6L14.6 11H9.4l.8-2.8Z" fill="currentColor"/></svg>'
  var panel = document.createElement("div")
  panel.id = "keystone-desk-panel"
  panel.setAttribute("data-testid", "chat-widget")
  panel.setAttribute("role", "dialog")
  panel.setAttribute("aria-label", "Keystone resident desk")
  panel.hidden = true
  panel.style.cssText = side(24) + "bottom:100px;transform-origin:" + (position === "left" ? "bottom left" : "bottom right")
  var frame = document.createElement("iframe")
  var themeQuery = theme === "system" ? "" : "?theme=" + encodeURIComponent(theme)
  frame.src = origin + "/widget" + themeQuery
  frame.title = "Keystone resident desk"
  frame.setAttribute("data-testid", "desk-frame")
  frame.style.cssText = "width:100%;height:100%;border:0;background:#F7F4EE"
  panel.appendChild(frame)
  var queued = null
  var ready = false
  function postPrompt(text) {
    if (!text) return
    if (ready && frame.contentWindow) frame.contentWindow.postMessage({ source: "keystone-host", type: "prompt", text: text }, origin)
    else queued = text
  }
  function setOpen(open) {
    var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (open) {
      panel.hidden = false
      button.setAttribute("aria-expanded", "true")
      button.setAttribute("aria-label", "Close chat")
      button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2"/></svg>'
      if (window.matchMedia("(max-width:639px)").matches) button.classList.add("is-hidden")
      requestAnimationFrame(function () { panel.classList.add("is-open") })
      nudges.style.display = "none"
      teaser.hidden = true
    } else {
      panel.classList.remove("is-open")
      button.classList.remove("is-hidden")
      button.setAttribute("aria-expanded", "false")
      button.setAttribute("aria-label", "Open chat with Keystone desk")
      button.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" aria-hidden="true"><path d="M4 20V11.2C4 6.9 7.6 3.5 12 3.5s8 3.4 8 7.7V20" stroke="currentColor" stroke-width="2"/><path d="M9.2 20v-4.2a2.8 2.8 0 0 1 5.6 0V20" stroke="currentColor" stroke-width="2"/><path d="M10.2 8.2h3.6L14.6 11H9.4l.8-2.8Z" fill="currentColor"/></svg>'
      window.setTimeout(function () {
        if (!panel.classList.contains("is-open")) panel.hidden = true
      }, reduce ? 0 : 180)
      button.focus()
    }
  }
  function openWith(text) {
    setOpen(true)
    postPrompt(text)
  }
  button.addEventListener("click", function () { setOpen(panel.hidden) })
  window.addEventListener("message", function (event) {
    if (!event.data || event.data.source !== "keystone") return
    if (event.data.type === "ready") {
      ready = true
      if (queued) { postPrompt(queued); queued = null }
    }
    if (event.data.type === "close") setOpen(false)
    if (event.data.type === "urgent" || event.data.type === "handoff") {
      var note = document.createElement("div")
      note.setAttribute("data-testid", "ops-toast")
      note.style.cssText = "position:fixed;top:16px;right:16px;z-index:2147483001;max-width:280px;padding:12px;border-radius:16px;background:#F7F4EE;color:#243044;box-shadow:0 8px 24px rgba(15,18,22,.16);font:500 13px/1.4 sans-serif"
      note.textContent = event.data.type === "urgent" ? "URGENT SMS sent to on-call. Desk alerted." : "New human support request"
      document.body.appendChild(note)
    }
  })
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false)
  })
  stack.appendChild(nudges)
  stack.appendChild(teaser)
  stack.appendChild(button)
  root.appendChild(panel)
  root.appendChild(stack)
  document.body.appendChild(root)
  var nudgeDelay = immediate ? 0 : 1200
  var teaserDelay = 4000
  if (!window.sessionStorage.getItem("keystone-nudges-dismissed")) {
    window.setTimeout(function () { nudges.style.display = "flex" }, nudgeDelay)
  }
  try {
    if (!localStorage.getItem("keystone-teaser-dismissed")) {
      window.setTimeout(function () { teaser.hidden = false }, teaserDelay)
    }
  } catch {
    window.setTimeout(function () { teaser.hidden = false }, teaserDelay)
  }
})()
