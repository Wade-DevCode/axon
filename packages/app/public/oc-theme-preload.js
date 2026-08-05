;(function () {
  var key = "axon-theme-id"
  var themeId = localStorage.getItem(key) || "oc-2"

  if (themeId === "oc-1") {
    themeId = "oc-2"
    localStorage.setItem(key, themeId)
    localStorage.removeItem("axon-theme-css-light")
    localStorage.removeItem("axon-theme-css-dark")
  }

  var scheme = localStorage.getItem("axon-color-scheme") || "system"
  var isDark = scheme === "dark" || (scheme === "system" && matchMedia("(prefers-color-scheme: dark)").matches)
  var mode = isDark ? "dark" : "light"

  document.documentElement.dataset.theme = themeId
  document.documentElement.dataset.colorScheme = mode

  // Update theme-color meta tag to match app color scheme
  var metas = document.querySelectorAll("meta[name='theme-color']")
  if (metas.length > 0) metas[0].setAttribute("content", isDark ? "#080808" : "#fafafa")

  if (themeId === "oc-2") return

  var css = localStorage.getItem("axon-theme-css-" + mode)
  if (css) {
    var style = document.createElement("style")
    var nonceSource = document.querySelector("script[nonce]")
    var nonce = nonceSource && (nonceSource.nonce || nonceSource.getAttribute("nonce"))
    style.id = "oc-theme-preload"
    if (nonce) style.setAttribute("nonce", nonce)
    style.textContent =
      ":root{color-scheme:" +
      mode +
      ";--text-mix-blend-mode:" +
      (isDark ? "plus-lighter" : "multiply") +
      ";" +
      css +
      "}"
    document.head.appendChild(style)
  }
})()
