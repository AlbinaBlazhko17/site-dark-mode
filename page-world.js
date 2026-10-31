// This script runs in the page's own JavaScript world.
// It changes window.matchMedia, so that site code that asks
// "does the user prefer dark?" gets the answer "yes".

(function () {
  // Do not run two times in the same page.
  if (window.__siteDarkModeLoaded === true) {
    return;
  }
  window.__siteDarkModeLoaded = true;

  const originalMatchMedia = window.matchMedia;

  // If the browser is already dark, the site is already dark. Do nothing.
  const browserIsDark = originalMatchMedia.call(window, "(prefers-color-scheme: dark)").matches;
  if (browserIsDark) {
    return;
  }

  // The script starts only when dark sites are on.
  let isOn = true;

  // Change "dark" to "light" and "light" to "dark" in a media query.
  // The browser is in light mode, so after the swap the dark queries match.
  // Keep this function the same as the one in content.js.
  function swapColorScheme(text) {
    const pattern = /prefers-color-scheme\s*:\s*(dark|light)/gi;
    return text.replace(pattern, function (match, scheme) {
      if (scheme.toLowerCase() === "dark") {
        return "prefers-color-scheme: light";
      }
      return "prefers-color-scheme: dark";
    });
  }

  window.matchMedia = function matchMedia(query) {
    let text = String(query);
    if (isOn) {
      text = swapColorScheme(text);
    }
    return originalMatchMedia.call(window, text);
  };

  // content.js sends these events when the user clicks the toolbar icon.
  document.addEventListener("site-dark-mode-on", function () {
    isOn = true;
  });
  document.addEventListener("site-dark-mode-off", function () {
    isOn = false;
  });
})();
