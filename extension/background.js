// Service worker. All network calls happen here, not in content.js.
//
// Why: a content script runs inside the page, so its requests carry the
// *page's* origin (https://docs.google.com, etc.). That would force the API
// to accept every origin on the internet. Requests from the service worker
// carry chrome-extension://<your-id>, so the backend can lock CORS down to
// just this extension.

const API_BASE = "https://REPLACE-ME.onrender.com"; // ← your Render URL

const ENDPOINTS = {
  shakespeare: "/transform",
  brainrot: "/brainrot",
};

async function transform(style, text) {
  const path = ENDPOINTS[style];
  if (!path) throw new Error(`Unknown style: ${style}`);

  const controller = new AbortController();
  // Render's free tier sleeps; a cold start can take ~30s.
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });

    if (res.status === 429) throw new Error("Too many requests — wait a moment.");
    if (!res.ok) throw new Error(`Server error (${res.status})`);

    const data = await res.json();
    if (!data.result) throw new Error("Empty response.");
    return data.result;
  } finally {
    clearTimeout(timeout);
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.type !== "transform") return false;

  transform(msg.style, msg.text)
    .then((result) => sendResponse({ ok: true, result }))
    .catch((err) => {
      const aborted = err.name === "AbortError";
      sendResponse({
        ok: false,
        error: aborted ? "Timed out — the server may be waking up." : err.message,
      });
    });

  return true; // keep the message channel open for the async reply
});
