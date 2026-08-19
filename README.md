TLDR: Saves you from having to copy and paste a candidate's name from email/LinkedIn/ATS (ashby in this case) to LinkedIn/ATS

How: Install into a userscript manager, highlight the name, cmd+a for Ashby, and cmd+l for LinkedIn

Does/can it work for Lever/another ATS?: Can be modified for Lever (tested). Ask your Claude for other ATS.


# Text Search Shortcuts (Ashby + LinkedIn)

A tiny [userscript](https://en.wikipedia.org/wiki/Userscript) that turns any highlighted text into a search.

- **Select text → `Cmd/Ctrl + L`** → searches it on **LinkedIn** (opens results directly)
- **Select text → `Cmd/Ctrl + A`** → searches it in **Ashby** (opens the candidate search and fills it in for you automatically)

Results open in a new tab. Handy for jumping from an email, a résumé, or a web page straight into your ATS or LinkedIn without copy-pasting.

It is deliberately **disabled** on spreadsheet / document apps (Google Sheets, Excel Online, Office, etc.) and while you're typing in a text field, so it never hijacks those shortcuts.

## Install

1. Install a userscript manager — [Tampermonkey](https://www.tampermonkey.net/) (Chrome, Edge, Firefox, Safari) is the most common.
2. Click the raw script to install it:
   **[`selection-search.user.js`](https://raw.githubusercontent.com/mireisakurai/selection-search-userscript/main/selection-search.user.js)**
   Tampermonkey will open an install screen — click **Install**.
3. Done. Highlight some text on any page and press the shortcut.

> These links assume a repo at `github.com/mireisakurai/selection-search-userscript` with the default branch named `main`. If you name the repo or branch differently, update the URLs to match.

## Configure

Everything you'd want to change lives in two blocks at the top of the script.

### Change where a key searches

```js
const SEARCHES = [
    { key: 'l', name: 'LinkedIn', url: (q) => `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}` },
    { key: 'a', name: 'Ashby',    url: (q) => `https://app.ashbyhq.com/candidate-searches/new#${HASH_KEY}=${encodeURIComponent(q)}`, copyToClipboard: true },
];
```

Add, remove, or re-key any entry. `${q}` is the highlighted text.

> **Why Ashby works differently.** Ashby runs its candidate search entirely in the browser and never puts the query in the URL, so there's no `?q=` to link to. Instead, the script passes your text to Ashby via the URL `#hash`, and an **auto-fill** block (which runs when the script loads on the Ashby page) types it into the search box and presses Enter. `copyToClipboard: true` is a safety net — if auto-fill ever misses, your text is on the clipboard to paste.

### Fix the Ashby auto-fill if it targets the wrong box

The auto-fill guesses which field is the search box. If it fills the wrong one (or none), open the `SEARCH_FIELD_SELECTORS` list near the bottom of the script and add a selector for the real box at the **top** of the list. To find it: right-click Ashby's search box → **Inspect**, and use its `placeholder` or `aria-label`, e.g.:

```js
const SEARCH_FIELD_SELECTORS = [
    'input[placeholder="Search candidates"]', // <- your exact box goes first
    // ...existing fallbacks below
];
```

### Change where it's disabled

```js
const EXCLUDED_DOMAINS = [
    'docs.google.com', 'sheets.google.com', 'slides.google.com',
    'office.com', 'sharepoint.com', // ...
];
```

Subdomains match automatically (e.g. anything under `*.sharepoint.com`). The script also skips any moment you're focused in a text box or a spreadsheet cell.

## Notes

- **Desktop apps aren't affected.** Userscripts only run in the browser, so the shortcut can't fire inside the Excel or Word *desktop* apps regardless — the exclusions above cover the *web* versions.
- Works on macOS (`Cmd`) and Windows/Linux (`Ctrl`).

## License

[MIT](./LICENSE) — free to use, modify, and share.
