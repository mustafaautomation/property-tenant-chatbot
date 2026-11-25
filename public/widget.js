(function () {
  var script = document.currentScript
  if (!script) {
    var scripts = document.querySelectorAll("script[src*='widget.js']")
    script = scripts[scripts.length - 1] || null
  }
  var origin = (script && script.getAttribute("data-origin")) || window.location.origin
  var root = document.createElement("div")
  root.setAttribute("data-keystone-widget", "true")
  var button = document.createElement("button")
  button.type = "button"
  button.setAttribute("data-testid", "launcher")
  button.setAttribute("aria-label", "Open the Keystone resident desk")
  button.setAttribute("aria-expanded", "false")
  button.setAttribute("aria-controls", "keystone-desk-panel")
  button.textContent = "Desk"
  button.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:16px",
    "z-index:2147483000",
    "height:56px",
    "min-width:56px",
    "padding:0 16px",
    "border:0",
    "border-radius:999px",
    "background:#1B3A2F",
    "color:#F6F1E7",
    "font:600 15px/1 sans-serif",
    "box-shadow:0 8px 24px rgba(27,58,47,.28)",
    "cursor:pointer",
  ].join(";")
  var panel = document.createElement("div")
  panel.id = "keystone-desk-panel"
  panel.setAttribute("role", "dialog")
  panel.setAttribute("aria-label", "Keystone resident desk")
  panel.hidden = true
  panel.style.cssText = [
    "position:fixed",
    "right:16px",
    "bottom:84px",
    "z-index:2147483000",
    "width:min(380px, calc(100vw - 32px))",
    "height:min(640px, calc(100vh - 120px))",
    "border-radius:16px",
    "overflow:hidden",
    "box-shadow:0 16px 40px rgba(28,25,21,.24)",
    "background:#fff",
  ].join(";")
  var frame = document.createElement("iframe")
  frame.src = origin + "/widget"
  frame.title = "Keystone resident desk"
  frame.setAttribute("data-testid", "desk-frame")
  frame.style.cssText = "width:100%;height:100%;border:0"
  panel.appendChild(frame)
  function setOpen(open) {
    panel.hidden = !open
    button.setAttribute("aria-expanded", open ? "true" : "false")
    button.textContent = open ? "Close" : "Desk"
    if (open) frame.focus()
  }
  button.addEventListener("click", function () {
    setOpen(panel.hidden)
  })
  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) setOpen(false)
  })
  root.appendChild(panel)
  root.appendChild(button)
  document.body.appendChild(root)
})()
