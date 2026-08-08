# Shipping checklist

Work top to bottom. Step 0 is the only one that's urgent regardless of anything else.

---

## ⚠️ 0. Remove the leaked signing key — do this first

`extension.pem` is committed to your public repo. That's the private key Chrome uses to sign your `.crx`. Anyone who has it can build a modified extension that Chrome accepts as a legitimate update to yours.

**Important:** `C:\Users\rhida\Desktop\TextConvertExtension` is **not a git repo** — there's no `.git` folder in it. Whatever is on GitHub was pushed from somewhere else (GitHub Desktop, or the web uploader). So there's no local history to rewrite.

That actually makes this easier. Instead of doing surgery on the old folder, **push this folder (`textConvertExtension_ship`) as the new contents of the repo.** It's already clean: no `.pem`, no `.crx`, no `apikeys.py`, and a `.gitignore` that blocks all three.

**PowerShell (Windows — this is you):**

```powershell
cd C:\Users\rhida\Desktop\textConvertExtension_ship

# Clear out anything that shouldn't ship
Remove-Item -Recurse -Force __pycache__ -ErrorAction SilentlyContinue

git init
git add .
git commit -m "Rebuild: env-based secrets, service worker, locked CORS, rate limiting"
git branch -M main
git remote add origin https://github.com/potat4190/textConvertExtension.git
git push --force origin main
```

`-Force` does two jobs in PowerShell: it deletes hidden items (`.git`, `__pycache__`) and skips the confirmation prompt. `-ErrorAction SilentlyContinue` stops it complaining if a folder is already gone. Note there is **no `rm -rf`** in PowerShell — `rm` is an alias for `Remove-Item`, which takes named flags instead.

`--force` on the push is what overwrites the old history on GitHub, which is what removes `extension.pem` from the public record.

**Then, on github.com:** confirm `extension.pem` and `extension.crx` are gone from the file list. If GitHub still shows them, the push didn't overwrite — check you're on `main`.

Once that's confirmed, you can delete the old `Desktop\TextConvertExtension` folder, or keep it as a local backup. Just never push it.

<details>
<summary>macOS / Linux equivalent</summary>

```bash
cd textConvertExtension_ship
rm -rf __pycache__
git init && git add . && git commit -m "Rebuild"
git branch -M main
git remote add origin https://github.com/potat4190/textConvertExtension.git
git push --force origin main
```
</details>

> You don't need the old `.pem`. Publishing through the Web Store means Google manages signing and issues you a permanent extension ID.

---

## 1. Confirm the folder is complete

This folder should contain all of these before you push:

```
textConvertExtension_ship/
├── .gitignore
├── main.py
├── requirements.txt
├── brainrot_phrases.txt      ← main.py loads this
├── README.md
├── PRIVACY.md
├── DEPLOY.md
└── extension/
    ├── manifest.json
    ├── background.js
    ├── content.js
    ├── style.css             ← manifest references this
    └── icons/                ← you still need to create these
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

Do **not** carry over `apikeys.py` (the key comes from the environment now) or `terminal_command.txt` (the README covers it).

Check it runs locally before deploying anything:

```powershell
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

$env:GEMINI_API_KEY = "your-key-here"
uvicorn main:app --reload
```

Then in a second terminal:

```powershell
curl http://127.0.0.1:8000/health     # → {"status":"ok"}
```

If it starts without the `RuntimeError` about `GEMINI_API_KEY`, the environment variable is being read correctly.

---

## 2. Deploy the backend to Render

1. [render.com](https://render.com) → sign in with GitHub → **New → Web Service**
2. Pick the `textConvertExtension` repo
3. Settings:
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance type:** Free
4. **Environment** tab → add `GEMINI_API_KEY` = your key
5. Deploy, then confirm: `https://your-app.onrender.com/health` returns `{"status":"ok"}`

Copy that URL. You need it twice in the next step.

---

## 3. Point the extension at it

- `extension/background.js` → set `API_BASE` to your Render URL (no trailing slash)
- `extension/manifest.json` → set `host_permissions` to `["https://your-app.onrender.com/*"]`

Reload the unpacked extension at `chrome://extensions` and test it on a real page.

**If the buttons say "Timed out"** the free instance was asleep — try once more, it'll be awake.

---

## 4. Add icons

The manifest expects `extension/icons/icon16.png`, `icon48.png`, and `icon128.png`. The Web Store requires the 128px one. Anything clean works — even two letters on a solid background.

---

## 5. Publish to the Chrome Web Store

1. Register at the [Developer Dashboard](https://chrome.google.com/webstore/devconsole) — **$5 one-time fee**
2. Zip the *contents* of `extension/` (not the folder itself) and upload
3. You'll need:
   - **Description** — the README's opening line works
   - **At least one 1280×800 screenshot** — a screenshot of the buttons over a text box
   - **Privacy policy URL** — host `PRIVACY.md` as a page on your GitHub Pages site and link it
   - **Permission justifications:**
     - `activeTab` — "Reads the user's text selection only when they click a rewrite button."
     - `host_permissions` — "Sends the selected text to the extension's own API to generate the rewrite."
     - `<all_urls>` content script — "The extension works in text fields on any site, so the user chooses where to use it."
   - **Data use disclosure** — tick *"Does not collect or transmit personally identifiable information"*, and declare that user-selected text is sent to a third-party API (Google Gemini) solely to produce the rewrite and is not stored.

**Review takes 1–3 days, sometimes longer on a first submission.** Submit by **Aug 13** to have the live link before the Aug 17 fellowship deadline.

> If review is still pending on the 17th, that's fine — say so. "Submitted to the Web Store, in review, here's the sideload link and a demo video" is still a shipped thing.

---

## 6. The last three things that make it "shipped"

Frontier Commons defines shipped as: **a live link · real users · a demo video · a feedback form.** The deploy gets you the first one.

- **Real users** — send it to five people. Actual people who will actually try it: roommates, your CS cohort, your esports team. Five is enough to have something true to say.
- **Demo video** — 30–45 seconds. Open Gmail, start typing a message, select a sentence, click Shakespeare, watch it change. No voiceover needed. Record with Loom, export a GIF for the README.
- **Feedback form** — a Google Form with three questions: *What did you try it on? What broke? What style should exist that doesn't?* Link it from the README and the Web Store listing.

Then update your portfolio card so the loudest button says **Install** instead of **View on GitHub**.

---

## Timeline against the Aug 17 deadline

| Day | Task | Time |
|---|---|---|
| **Today** | Step 0 — kill the leaked key | 30 min |
| **Fri Aug 14** — wait, do this **Fri Aug 7 or Sun Aug 9** | Steps 1–4: swap files, deploy, test, icons | 3 hrs |
| **Sun Aug 9** | Step 5: submit to Web Store | 1 hr |
| **Mon–Wed** | Review pending. Meanwhile: 5 users, demo GIF, feedback form | 2 hrs |
| **Thu Aug 13** | Update README + portfolio card | 1 hr |
| **Aug 14–17** | Record the Loom, submit the application | — |

Roughly 8 hours total. You have two free Fridays and two weekends before the deadline.
