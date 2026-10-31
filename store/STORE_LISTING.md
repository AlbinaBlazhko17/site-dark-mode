# Chrome Web Store listing: Site Dark Mode

Copy each part into the matching field of the
[Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## Store listing tab

**Name** (from manifest): `Site Dark Mode`

**Summary** (from manifest, max 132 characters):

```
Shows websites in their own dark mode while your browser stays light. Click the icon to turn it on or off.
```

**Category:** Accessibility

**Language:** English

**Description:**

```
Your browser stays light. Websites go dark.

Many people like a light browser: light tabs, a light sidebar, a light toolbar. But they want to read websites in dark mode. Most browsers cannot do this, because the browser theme and the website theme are the same setting.

Site Dark Mode separates them. Your browser keeps its light look, and each website shows its own dark mode.

HOW IT WORKS
• If a website has a dark mode, Site Dark Mode turns it on.
• If a website has no dark mode, Site Dark Mode does not change it. There are no generated colors and no broken pages.
• Click the toolbar icon to turn it on or off. A moon means "on". A sun means "off".

WHY IT LOOKS GOOD
Site Dark Mode does not paint new colors on the page. It uses the dark design that the website's own designers made. Thus logos, images, and colors look correct.

WORKS WITH
Dia, Google Chrome, Arc, Brave, Microsoft Edge, and other Chromium browsers.

PRIVACY
• No data collection.
• No analytics, no tracking, no server.
• The extension saves only one setting on your computer: on or off.

OPEN SOURCE
The code is free (MIT license): https://github.com/AlbinaBlazhko17/site-dark-mode

KNOWN LIMITS
• Some sites keep dark mode only behind their own button or account setting. The extension cannot turn on that button.
• Some sites change only after you reload the page.

Site Dark Mode is not made by, or connected with, Google or The Browser Company.
```

**Graphic assets** (all in this `store/` folder):

| Field | File | Size |
|-------|------|------|
| Store icon | `store-icon-128.png` | 128×128 |
| Screenshot 1 | `screenshot-1.png` | 1280×800 |
| Screenshot 2 | `screenshot-2.png` | 1280×800 |
| Small promo tile | `promo-small-440x280.png` | 440×280 |

**Official URL:** none (leave empty)

**Homepage URL:** `https://github.com/AlbinaBlazhko17/site-dark-mode`

**Support URL:** `https://github.com/AlbinaBlazhko17/site-dark-mode/issues`

**Mature content:** No

---

## Privacy tab

**Single purpose description:**

```
Site Dark Mode has one purpose: it makes websites show their own built-in dark mode while the browser itself stays in light mode. The user turns this on or off with one click on the toolbar icon.
```

**Permission justification: storage**

```
Saves one value on the user's computer: whether site dark mode is on or off. The extension reads this value when the browser starts and when the user clicks the icon.
```

**Permission justification: scripting**

```
Registers the content scripts that turn on the website's own dark-mode CSS, and adds these scripts to tabs that are already open when the user turns the extension on. This lets the change happen without a page reload.
```

**Permission justification: declarativeNetRequest**

```
Adds one request header, Sec-CH-Prefers-Color-Scheme: "dark", to page requests. Some websites (for example Google Search) choose the dark or light design on the server from this header. The rule only sets this header. It does not block, redirect, or read any request.
```

**Permission justification: host permissions (<all_urls>)**

```
The user wants dark mode on every website that has one, so the content scripts must run on all sites. The extension reads only the page's style sheets, to find the dark-mode CSS rules. Some style sheets come from another domain (a CDN), and the page cannot read them, so the background worker downloads the same public CSS file again. The extension does not read page text, forms, cookies, or history, and it sends no data anywhere.
```

**Are you using remote code?** No, I am not using remote code.

```
All JavaScript is inside the extension package. The extension downloads only CSS files that the open page already uses. It never downloads or runs JavaScript.
```

**Data usage:** do not select any data type. The extension collects none of them.

Select all three certifications:
- I do not sell or transfer user data to third parties, outside of the approved use cases.
- I do not use or transfer user data for purposes that are unrelated to my item's single purpose.
- I do not use or transfer user data to determine creditworthiness or for lending purposes.

**Privacy policy URL:**

```
https://github.com/AlbinaBlazhko17/site-dark-mode/blob/main/PRIVACY.md
```

---

## Distribution tab

- **Payments:** Free
- **Visibility:** Public
- **Regions:** All regions

---

## Steps to submit

1. Run `./build-zip.sh`. It makes `dist/site-dark-mode-<version>.zip`.
2. Open the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) and register (one-time fee: $5).
3. In the account settings, choose **non-trader** (a free hobby project).
4. Click **New item** and upload the zip.
5. Fill in the tabs with the text above.
6. Click **Submit for review**. Because of the `<all_urls>` permission, the review can take some days or more.

For a new version: increase `version` in `manifest.json`, run `./build-zip.sh` again, and upload the new zip on the **Package** tab.
