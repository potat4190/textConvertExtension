# AI Inline

**Select text in any text box, click a button, and it rewrites itself in a different style — without leaving the page.**

Two styles right now: Shakespearean English and Gen-Z "brainrot." It works inside `<input>` and `<textarea>` fields and in `contenteditable` editors like Gmail, Google Docs, and Notion.

<!-- Record a 10-second GIF of this and drop it here. It is the single
     highest-value thing you can add to this README. -->
![Demo](docs/demo.gif)

**[→ Install from the Chrome Web Store]([https://chromewebstore.google.com/detail/ai-inline-%E2%80%94-rewrite-selec/aipkheflklpdkjkoffchgedfgkbhnjik?authuser=0&hl=en])**

---

## How it works

```
You select text
      ↓
content.js  — detects the selection, shows the buttons, writes the result back
      ↓
background.js — service worker, makes the API call
      ↓
FastAPI on Render — builds the prompt, calls Gemini, returns the rewrite
```

The network call lives in the service worker rather than the content script on purpose: requests from a content script carry the *page's* origin, which would force the API to accept every origin on the internet. From the service worker they carry `chrome-extension://<id>`, so the backend can lock CORS to just this extension.

**Stack:** JavaScript (Manifest V3), Python, FastAPI, Google Gemini API (`gemini-2.0-flash`), deployed on Render.

---

## Run it locally

You'll need Python 3.10+ and a [Gemini API key](https://aistudio.google.com/apikey) (free tier is fine).

```bash
git clone https://github.com/potat4190/textConvertExtension
cd textConvertExtension

python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

export GEMINI_API_KEY="your-key-here"   # Windows: set GEMINI_API_KEY=...
uvicorn main:app --reload
```

Then point the extension at your local server:

1. In `extension/background.js`, set `API_BASE = "http://127.0.0.1:8000"`.
2. In `extension/manifest.json`, set `host_permissions` to `["http://127.0.0.1:8000/*"]`.
3. Go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select the `extension/` folder.

Open any site with a text box, select some text, and the buttons appear.

---

## Deploying the backend

See [DEPLOY.md](DEPLOY.md).

**Note:** the hosted version runs on Render's free tier, which sleeps after 15 minutes of inactivity. The first request after a nap takes about 30 seconds while the server wakes up. Subsequent ones are fast.

---

## What I'd build next

- **More styles, user-definable.** The prompt is the only difference between Shakespeare and brainrot — let people write their own and save it.
- **Streaming.** Right now you wait for the whole rewrite. Token streaming would make it feel instant.
- **Undo.** One keystroke to restore the original text.
- **Translation mode.** The same replace-in-place machinery works for translating a sentence you're writing in your second language. This is the version I actually want — I'm an international student, and the number of times I've wanted to check a sentence without leaving the text box is high.

---

## A note on the "brainrot" prompt

The original version of this prompt asked the model to add profanity and "nihilistic themes." I softened it to keep the humour and drop the profanity — partly because Chrome's content policy makes the explicit version a review problem, and partly because I'd rather this be something I can hand to anyone. The slang and the chaos are what made it funny anyway.

---

## Privacy

Selected text is sent to my server and forwarded to Google's Gemini API to generate the rewrite. Nothing is logged or stored. See [PRIVACY.md](PRIVACY.md).

---

## Feedback

Something broken, or a style you want? **[Tell me here](REPLACE-ME)** — or [open an issue](https://github.com/potat4190/textConvertExtension/issues).

Built by [Rhidaya Shrestha](https://potat4190.github.io/ProjectsDisplay/).
