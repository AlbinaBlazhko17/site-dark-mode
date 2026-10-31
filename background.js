// Background service worker.
// It keeps the on/off state, changes the toolbar icon,
// and turns the page scripts and the header rule on or off.

const PAGE_SCRIPT_ID = "site-dark-mode-page";
const CONTENT_SCRIPT_ID = "site-dark-mode-content";
const HEADER_RULESET_ID = "dark_header";

// Read the saved state. The default state is "on".
async function readEnabled() {
  const saved = await chrome.storage.local.get("enabled");
  if (saved.enabled === false) {
    return false;
  }
  return true;
}

// Show a moon when dark sites are on, and a sun when they are off.
async function updateIcon(enabled) {
  await iconsReady;
  if (enabled) {
    await chrome.action.setIcon({
      imageData: { 16: iconImages["moon-16.png"], 32: iconImages["moon-32.png"] },
    });
    await chrome.action.setTitle({ title: "Site Dark Mode: on (click to turn off)" });
  } else {
    await chrome.action.setIcon({
      imageData: { 16: iconImages["sun-16.png"], 32: iconImages["sun-32.png"] },
    });
    await chrome.action.setTitle({ title: "Site Dark Mode: off (click to turn on)" });
  }
}

// The header rule tells servers "this user prefers dark".
async function updateHeaderRule(enabled) {
  if (enabled) {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: [HEADER_RULESET_ID],
    });
  } else {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      disableRulesetIds: [HEADER_RULESET_ID],
    });
  }
}

// The page scripts load into new pages only while dark sites are on.
// Thus a new page never starts in dark mode when the user turned it off.
async function updateContentScripts(enabled) {
  const registered = await chrome.scripting.getRegisteredContentScripts();
  let isRegistered = false;
  for (const script of registered) {
    if (script.id === PAGE_SCRIPT_ID) {
      isRegistered = true;
    }
  }

  if (enabled && !isRegistered) {
    await chrome.scripting.registerContentScripts([
      {
        id: PAGE_SCRIPT_ID,
        js: ["page-world.js"],
        matches: ["<all_urls>"],
        runAt: "document_start",
        allFrames: true,
        world: "MAIN",
      },
      {
        id: CONTENT_SCRIPT_ID,
        js: ["content.js"],
        matches: ["<all_urls>"],
        runAt: "document_start",
        allFrames: true,
        world: "ISOLATED",
      },
    ]);
  }

  if (!enabled && registered.length > 0) {
    // With no filter, this removes all scripts of this extension,
    // also scripts with old names from an older version.
    await chrome.scripting.unregisterContentScripts();
  }
}

async function applyState(enabled) {
  await updateIcon(enabled);
  await updateHeaderRule(enabled);
  await updateContentScripts(enabled);
}

// The icon images, ready to use. We load them one time,
// because loading a PNG file at each click makes the icon change slower.
const iconImages = {};

async function loadIconImage(fileName) {
  if (iconImages[fileName]) {
    return iconImages[fileName];
  }
  const response = await fetch(chrome.runtime.getURL("icons/" + fileName));
  const blob = await response.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0);
  iconImages[fileName] = context.getImageData(0, 0, bitmap.width, bitmap.height);
  return iconImages[fileName];
}

// Start to load the icons as soon as the worker starts.
const iconsReady = Promise.all([
  loadIconImage("moon-16.png"),
  loadIconImage("moon-32.png"),
  loadIconImage("sun-16.png"),
  loadIconImage("sun-32.png"),
]);

// Put the scripts into tabs that are open now.
// If a tab already has a working copy of a script, the new copy stops.
// If a tab has an old copy from before a reload or an update,
// the new copy replaces it. The old copy cannot get the clicks any more.
// page-world.js starts in the "on" state, so we add it only when turning on.
async function injectIntoOpenTabs(enabled) {
  const tabs = await chrome.tabs.query({});
  for (const tab of tabs) {
    try {
      if (enabled) {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id, allFrames: true },
          files: ["page-world.js"],
          world: "MAIN",
        });
      }
      await chrome.scripting.executeScript({
        target: { tabId: tab.id, allFrames: true },
        files: ["content.js"],
        world: "ISOLATED",
      });
    } catch (error) {
      // Some pages do not accept scripts, for example browser settings pages.
      // We ignore these pages.
    }
  }
}

// The user clicks the toolbar icon.
async function toggleDarkSites() {
  const enabled = await readEnabled();
  const newEnabled = !enabled;

  // Change the icon first, so that the user sees the click at once.
  await updateIcon(newEnabled);

  // The content scripts in open tabs listen for this change.
  await chrome.storage.local.set({ enabled: newEnabled });
  await updateHeaderRule(newEnabled);
  await updateContentScripts(newEnabled);
  await injectIntoOpenTabs(newEnabled);
}

chrome.action.onClicked.addListener(toggleDarkSites);

chrome.runtime.onInstalled.addListener(async function () {
  const enabled = await readEnabled();
  await applyState(enabled);
  await injectIntoOpenTabs(enabled);
});

chrome.runtime.onStartup.addListener(async function () {
  const enabled = await readEnabled();
  await applyState(enabled);
});

// The content script cannot read style sheets from other domains.
// The background worker can download them, so it does this job.
async function fetchCssText(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return "";
    }
    return await response.text();
  } catch (error) {
    return "";
  }
}

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (message.type === "fetch-css") {
    fetchCssText(message.url).then(sendResponse);
    // "true" tells Chrome that the answer comes later.
    return true;
  }
  return false;
});
