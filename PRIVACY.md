# Privacy Policy for Site Dark Mode

Last update: October 31, 2026

## Summary

Site Dark Mode does not collect, store, sell, or send any personal data.

## What the extension stores

The extension stores one value on your computer: whether dark mode for websites is on or off.
It uses the browser's local extension storage (`chrome.storage.local`) for this value.
This value never leaves your computer.

## What the extension reads

- The extension reads the style sheets (CSS) of the pages that you open.
  It does this only to find the dark-mode styles of the page and to turn them on.
- Some style sheets come from other domains, and the browser does not let the page read them.
  For these style sheets, the extension downloads the same CSS file again from the same address.
  It does not send any data to that address that the page itself does not send.
- The extension does not read page text, form data, passwords, cookies, or browsing history.

## What the extension sends

- The extension adds one request header to page requests: `Sec-CH-Prefers-Color-Scheme: "dark"`.
  This header tells the website that you prefer dark mode. It contains no personal data.
- The extension has no server. It uses no analytics and no tracking.

## Contact

If you have a question about this policy, open an issue at
https://github.com/AlbinaBlazhko17/site-dark-mode/issues
