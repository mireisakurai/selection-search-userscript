// ==UserScript==
// @name         Text Search Shortcuts (Ashby + LinkedIn)
// @namespace    https://github.com/mireisakurai/selection-search-userscript
// @version      1.1.0
// @description  Select text and press Cmd/Ctrl+L to search it on LinkedIn, or Cmd/Ctrl+A to auto-search it in Ashby. Disabled in spreadsheet / document / office apps.
// @author       Mirei Sakurai
// @match        *://*/*
// @grant        GM_setClipboard
// @license      MIT
// @downloadURL  https://raw.githubusercontent.com/mireisakurai/selection-search-userscript/main/selection-search.user.js
// @updateURL    https://raw.githubusercontent.com/mireisakurai/selection-search-userscript/main/selection-search.user.js
// ==/UserScript==

(function () {
    'use strict';

    // ---------------------------------------------------------------------
    // CONFIG 1: which key searches where.
    // The search fires on Cmd (macOS) or Ctrl (Windows/Linux) + the key.
    // `key` must be lowercase. `url(q)` returns the page to open.
    //
    // Ashby runs its search client-side (nothing goes in the URL), so we can't
    // link straight to results. Instead we open the search page with the text
    // in the URL #hash, and the AUTOFILL block further down (which runs when
    // this same script loads on the Ashby page) types it into the search box
    // and presses Enter for you. `copyToClipboard: true` is kept as a safety
    // net: if the auto-fill ever misses, the text is on your clipboard to paste.
    // ---------------------------------------------------------------------
    const HASH_KEY = 'sss_q'; // marker used to pass text to the Ashby page

    const SEARCHES = [
        {
            key: 'l',
            name: 'LinkedIn',
            url: (q) => `https://www.linkedin.com/search/results/all/?keywords=${encodeURIComponent(q)}`,
        },
        {
            key: 'a',
            name: 'Ashby',
            url: (q) => `https://app.ashbyhq.com/candidate-searches/new#${HASH_KEY}=${encodeURIComponent(q)}`,
            copyToClipboard: true,
        },
    ];

    function copyText(text) {
        if (typeof GM_setClipboard === 'function') {
            GM_setClipboard(text);
        } else if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text);
        }
    }

    // ---------------------------------------------------------------------
    // CONFIG 2: domains where the shortcuts should NEVER fire, because
    // Cmd/Ctrl+L / +I already mean something there (spreadsheets, docs, etc).
    // Subdomains are matched automatically (e.g. *.sharepoint.com).
    // ---------------------------------------------------------------------
    const EXCLUDED_DOMAINS = [
        'docs.google.com',
        'sheets.google.com',
        'slides.google.com',
        'drive.google.com',
        'office.com',
        'officeapps.live.com',
        'office.live.com',
        'excel.office.com',
        'onedrive.live.com',
        'sharepoint.com',
    ];

    function isExcludedDomain() {
        const host = window.location.host.toLowerCase();
        return EXCLUDED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
    }

    // Also skip when the user is typing/editing (inputs, text areas, and
    // rich-text / spreadsheet cell editors, which use contentEditable).
    // This is the main guard that stops the shortcut hijacking a keystroke
    // inside Excel Online, Google Sheets, etc.
    function isEditingContext() {
        const el = document.activeElement;
        if (!el) return false;
        const tag = el.tagName;
        return (
            el.isContentEditable ||
            tag === 'INPUT' ||
            tag === 'TEXTAREA' ||
            tag === 'SELECT'
        );
    }

    document.addEventListener('keydown', function (event) {
        // Require exactly the Cmd (mac) or Ctrl (win/linux) modifier.
        if (!event.metaKey && !event.ctrlKey) return;
        if (event.altKey) return;

        // Bail out in spreadsheet/office apps or while editing text.
        if (isExcludedDomain() || isEditingContext()) return;

        const pressed = event.key.toLowerCase();
        const target = SEARCHES.find((s) => s.key === pressed);
        if (!target) return;

        const selection = window.getSelection().toString().trim();
        if (selection === '') return;

        event.preventDefault();
        if (target.copyToClipboard) {
            copyText(selection);
        }
        window.open(target.url(selection), '_blank');
    });

    // =====================================================================
    // AUTO-FILL (runs on the Ashby page)
    // When we open Ashby with text in the URL #hash, this finds the search
    // box, types the text the way React expects, and presses Enter.
    //
    // If it fills the wrong box (or none), tweak SEARCH_FIELD_SELECTORS below:
    // right-click Ashby's search box -> Inspect, and add a selector that
    // matches it (e.g. 'input[placeholder="Search candidates"]') to the TOP
    // of the list. The first visible match wins.
    // =====================================================================
    const AUTOFILL_HOST = 'ashbyhq.com';
    const SUBMIT_AFTER_FILL = true; // press Enter once filled
    const SEARCH_FIELD_SELECTORS = [
        'input[placeholder*="search" i]',
        'input[aria-label*="search" i]',
        'input[type="search"]',
        'textarea[placeholder*="search" i]',
        '[role="combobox"] input',
        'input[type="text"]',
        'textarea',
        '[contenteditable="true"]',
    ];

    function getHashQuery() {
        const m = window.location.hash.match(new RegExp('[#&]' + HASH_KEY + '=([^&]*)'));
        return m ? decodeURIComponent(m[1].replace(/\+/g, ' ')) : '';
    }

    function isVisible(el) {
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0;
    }

    function findSearchField() {
        for (const sel of SEARCH_FIELD_SELECTORS) {
            const el = Array.prototype.find.call(document.querySelectorAll(sel), isVisible);
            if (el) return el;
        }
        return null;
    }

    // Set a value so a React-controlled input actually notices the change.
    function setFieldValue(el, value) {
        if (el.isContentEditable) {
            el.focus();
            document.execCommand('selectAll', false, null);
            document.execCommand('insertText', false, value);
            return;
        }
        const proto = el.tagName === 'TEXTAREA'
            ? window.HTMLTextAreaElement.prototype
            : window.HTMLInputElement.prototype;
        const setter = Object.getOwnPropertyDescriptor(proto, 'value').set;
        setter.call(el, value);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function pressEnter(el) {
        for (const type of ['keydown', 'keypress', 'keyup']) {
            el.dispatchEvent(new KeyboardEvent(type, {
                key: 'Enter', code: 'Enter', keyCode: 13, which: 13, bubbles: true,
            }));
        }
    }

    function runAutofill() {
        const query = getHashQuery();
        if (!query) return;

        let tries = 0;
        const timer = setInterval(function () {
            const field = findSearchField();
            if (field) {
                clearInterval(timer);
                field.focus();
                setFieldValue(field, query);
                if (SUBMIT_AFTER_FILL) pressEnter(field);
                // Remove the hash so a manual refresh doesn't re-trigger it.
                window.history.replaceState(null, '', window.location.pathname + window.location.search);
            } else if (++tries > 40) {
                clearInterval(timer); // give up after ~10s
            }
        }, 250);
    }

    if (window.location.host.toLowerCase().endsWith(AUTOFILL_HOST)) {
        runAutofill();
        window.addEventListener('hashchange', runAutofill);
    }
})();
