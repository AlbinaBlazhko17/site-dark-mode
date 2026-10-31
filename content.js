// This script runs in the extension's own world, next to the page.
// It finds the dark-mode CSS of the site and turns it on.
// It also turns it off again when the user clicks the toolbar icon.

(function () {
  // Another copy of this script can already be in the page.
  // We ask it "are you there?". A working copy answers at once.
  // (DOM events run at once and all copies of the script can see them.)
  let workingCopyAnswered = false;
  function onAnswer() {
    workingCopyAnswered = true;
  }
  document.addEventListener("site-dark-mode-answer", onAnswer);
  document.dispatchEvent(new CustomEvent("site-dark-mode-question"));
  document.removeEventListener("site-dark-mode-answer", onAnswer);

  if (workingCopyAnswered) {
    return;
  }

  // An old copy can stay in the page after the extension reloads or updates.
  // It cannot get the clicks any more, so it does not answer.
  // We tell it to undo its changes and stop. Then this copy takes its place.
  document.dispatchEvent(new CustomEvent("site-dark-mode-stop-old-copy"));

  // If the browser is already dark, the site is already dark. Do nothing.
  // (In this world, matchMedia is the real one. page-world.js does not change it here.)
  const browserIsDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (browserIsDark) {
    return;
  }

  let isOn = false;

  // Style sheets that we already checked.
  let checkedSheets = new WeakSet();

  // Every change that we make, so that we can undo it.
  // Each item: { mediaList, originalText }
  let changedMediaLists = [];
  // Each item: { element, originalValue }
  let changedElements = [];
  // Style sheets that we added to the page.
  let addedSheets = [];
  // The old inline "color-scheme" value of the <html> element, or null.
  let originalRootColorScheme = null;

  // Change "dark" to "light" and "light" to "dark" in a media query.
  // The browser is in light mode, so after the swap the dark queries match.
  // Keep this function the same as the one in page-world.js.
  function swapColorScheme(text) {
    const pattern = /prefers-color-scheme\s*:\s*(dark|light)/gi;
    return text.replace(pattern, function (match, scheme) {
      if (scheme.toLowerCase() === "dark") {
        return "prefers-color-scheme: light";
      }
      return "prefers-color-scheme: dark";
    });
  }

  function hasColorScheme(text) {
    return /prefers-color-scheme/i.test(text);
  }

  // A media list is the condition part of "@media (...)".
  function swapMediaList(mediaList) {
    const text = mediaList.mediaText;
    if (!hasColorScheme(text)) {
      return;
    }
    changedMediaLists.push({ mediaList: mediaList, originalText: text });
    mediaList.mediaText = swapColorScheme(text);
  }

  // Look at all CSS rules. Rules can be inside other rules,
  // for example "@media" inside "@supports", so we also look inside.
  function swapRules(ruleList) {
    for (let i = 0; i < ruleList.length; i++) {
      const rule = ruleList[i];

      // "@media" and "@import" rules have a media list.
      if (rule.media) {
        swapMediaList(rule.media);
      }

      // Group rules ("@media", "@supports", "@layer", ...) have child rules.
      if (rule.cssRules) {
        swapRules(rule.cssRules);
      }

      // "@import" rules have their own style sheet.
      if (rule.styleSheet) {
        checkSheet(rule.styleSheet);
      }
    }
  }

  function checkSheet(sheet) {
    if (checkedSheets.has(sheet)) {
      return;
    }
    checkedSheets.add(sheet);

    let rules = null;
    try {
      rules = sheet.cssRules;
    } catch (error) {
      // The browser does not let us read style sheets from other domains.
      // We download a copy of them instead.
      if (sheet.href) {
        copyDarkRulesFromOtherDomain(sheet.href);
      }
      return;
    }

    if (rules) {
      swapRules(rules);
    }
  }

  // A copied style sheet lives on the page's domain, so a relative path
  // like url(img.png) now points to the wrong place.
  // This function makes each relative path a full address.
  function makeUrlsAbsolute(cssText, sheetUrl) {
    const pattern = /url\(\s*(['"]?)([^'")]+)\1\s*\)/g;
    return cssText.replace(pattern, function (match, quote, path) {
      if (path.startsWith("data:")) {
        return match;
      }
      try {
        const fullUrl = new URL(path, sheetUrl).href;
        return 'url("' + fullUrl + '")';
      } catch (error) {
        return match;
      }
    });
  }

  // Download a style sheet from another domain.
  // Keep only the rules that are about the color scheme, swap them,
  // and add them to the page as a new style sheet.
  async function copyDarkRulesFromOtherDomain(url) {
    let cssText = "";
    try {
      cssText = await chrome.runtime.sendMessage({ type: "fetch-css", url: url });
    } catch (error) {
      return;
    }

    if (!cssText || !hasColorScheme(cssText)) {
      return;
    }

    // The user can turn dark sites off while we wait for the download.
    if (!isOn) {
      return;
    }

    const copy = new CSSStyleSheet();
    try {
      copy.replaceSync(makeUrlsAbsolute(cssText, url));
    } catch (error) {
      return;
    }

    // Remove the rules that do not use the color scheme.
    // We go from the end to the start, because removing changes the positions.
    for (let i = copy.cssRules.length - 1; i >= 0; i--) {
      const ruleText = copy.cssRules[i].cssText;
      if (!hasColorScheme(ruleText)) {
        copy.deleteRule(i);
      }
    }

    swapRules(copy.cssRules);

    document.adoptedStyleSheets.push(copy);
    addedSheets.push(copy);
  }

  // Some HTML elements have a "media" attribute, for example:
  // <link rel="stylesheet" media="(prefers-color-scheme: dark)" href="dark.css">
  // <source media="(prefers-color-scheme: dark)" srcset="logo-dark.png">
  function swapElements() {
    const elements = document.querySelectorAll("link[media], style[media], source[media]");
    for (const element of elements) {
      if (element.dataset.siteDarkMode === "done") {
        continue;
      }
      const value = element.getAttribute("media");
      if (!hasColorScheme(value)) {
        continue;
      }
      element.dataset.siteDarkMode = "done";
      changedElements.push({ element: element, originalValue: value });
      element.setAttribute("media", swapColorScheme(value));
    }
  }

  // Some sites say "I support dark" only with the "color-scheme" setting.
  // Then the browser makes the page dark by itself, but only if we ask for dark.
  function siteSupportsDarkColorScheme() {
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta && meta.content.includes("dark")) {
      return true;
    }
    const root = document.documentElement;
    if (root) {
      const value = getComputedStyle(root).colorScheme;
      if (value.includes("dark") && !value.includes("only")) {
        return true;
      }
    }
    return false;
  }

  function applyRootColorScheme() {
    const root = document.documentElement;
    if (!root || originalRootColorScheme !== null) {
      return;
    }
    if (!siteSupportsDarkColorScheme()) {
      return;
    }
    originalRootColorScheme = root.style.colorScheme;
    root.style.colorScheme = "dark";
  }

  function scanPage() {
    if (!isOn) {
      return;
    }
    for (const sheet of document.styleSheets) {
      checkSheet(sheet);
    }
    swapElements();
    applyRootColorScheme();
  }

  // Pages add new styles all the time. We wait a short time
  // and then scan once, not once for every small change.
  let scanTimer = null;
  function scheduleScan() {
    if (scanTimer !== null) {
      return;
    }
    scanTimer = setTimeout(function () {
      scanTimer = null;
      scanPage();
    }, 30);
  }

  function turnOn() {
    isOn = true;
    document.dispatchEvent(new CustomEvent("site-dark-mode-on"));
    scanPage();
  }

  function turnOff() {
    isOn = false;
    document.dispatchEvent(new CustomEvent("site-dark-mode-off"));
    undoChanges();
  }

  function undoChanges() {
    for (const item of changedMediaLists) {
      item.mediaList.mediaText = item.originalText;
    }
    changedMediaLists = [];

    for (const item of changedElements) {
      item.element.setAttribute("media", item.originalValue);
      delete item.element.dataset.siteDarkMode;
    }
    changedElements = [];

    const keptSheets = [];
    for (const sheet of document.adoptedStyleSheets) {
      if (!addedSheets.includes(sheet)) {
        keptSheets.push(sheet);
      }
    }
    document.adoptedStyleSheets = keptSheets;
    addedSheets = [];

    if (originalRootColorScheme !== null && document.documentElement) {
      document.documentElement.style.colorScheme = originalRootColorScheme;
    }
    originalRootColorScheme = null;

    // After "on" again, we must check all style sheets again.
    checkedSheets = new WeakSet();
  }

  // Scan again when the page adds new <style> or <link> elements.
  const observer = new MutationObserver(scheduleScan);
  observer.observe(document, { childList: true, subtree: true });

  // A <link> style sheet is ready only after it loads.
  // The "load" event does not bubble, so we listen in the capture phase.
  document.addEventListener(
    "load",
    function (event) {
      if (event.target.tagName === "LINK") {
        scheduleScan();
      }
    },
    true
  );

  document.addEventListener("DOMContentLoaded", scheduleScan);
  window.addEventListener("load", scheduleScan);

  // A new copy of this script asks "are you there?".
  // We answer only if we are still connected to the extension.
  // After a reload or an update, chrome.runtime.id is empty in an old copy.
  function onQuestion() {
    if (chrome.runtime && chrome.runtime.id) {
      document.dispatchEvent(new CustomEvent("site-dark-mode-answer"));
    }
  }
  document.addEventListener("site-dark-mode-question", onQuestion);

  // A new copy took our place. Undo our changes and stop.
  function onStopOldCopy() {
    isOn = false;
    undoChanges();
    observer.disconnect();
    document.removeEventListener("site-dark-mode-question", onQuestion);
    document.removeEventListener("site-dark-mode-stop-old-copy", onStopOldCopy);
  }
  document.addEventListener("site-dark-mode-stop-old-copy", onStopOldCopy);

  // The user clicks the toolbar icon. background.js saves the new state.
  chrome.storage.onChanged.addListener(function (changes, areaName) {
    if (areaName !== "local" || !changes.enabled) {
      return;
    }
    if (changes.enabled.newValue === false) {
      turnOff();
    } else {
      turnOn();
    }
  });

  // Start. This script loads only when dark sites are on,
  // but we check the saved state to be sure.
  chrome.storage.local.get("enabled").then(function (saved) {
    if (saved.enabled !== false) {
      turnOn();
    }
  });
})();
