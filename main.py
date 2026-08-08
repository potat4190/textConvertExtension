"""
AI Inline — FastAPI backend.

Changes from the original:
  - API key now read from the environment, never imported from a local file.
  - CORS locked to chrome-extension:// origins instead of "*".
  - Per-IP rate limiting so a public URL can't drain your Gemini quota.
  - /health endpoint (Render pings it; also lets you check the server is awake).
  - Input length cap and real error handling instead of 500s.
  - Brainrot phrases loaded once at startup, not on every request.
"""

import os
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from google import genai
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

# --- Config -----------------------------------------------------------------

GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise RuntimeError(
        "GEMINI_API_KEY is not set. Locally: export GEMINI_API_KEY=... "
        "On Render: add it under Environment."
    )

# gemini-2.0-flash was shut down 2026-06-01. 2.5-flash is the direct replacement.
# Override without editing code:  $env:GEMINI_MODEL = "gemini-2.5-flash-lite"
MODEL_ID = os.environ.get("GEMINI_MODEL", "gemini-3.5-flash")
MAX_CHARS = 2000  # anything longer is almost certainly not a real selection

client = genai.Client(api_key=GEMINI_API_KEY)
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AI Inline", version="1.1.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Only the extension may call this API.
# Chrome extension IDs are always 32 letters in the range a-p.
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"^chrome-extension://[a-p]{32}$",
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

# --- Data -------------------------------------------------------------------


def _load_phrases(path: str = "brainrot_phrases.txt") -> str:
    try:
        return Path(path).read_text(encoding="utf-8").strip()
    except OSError:
        return ""


BRAINROT_PHRASES = _load_phrases()


class TextRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=MAX_CHARS)
    mode: Optional[str] = None  # unused; kept so old clients don't break


# --- Prompts ----------------------------------------------------------------

SHAKESPEARE_PROMPT = (
    "Rewrite the following modern English text in Shakespearean style. "
    "Keep roughly the same length. Return ONLY the rewritten text, with no "
    "preamble, quotation marks, or explanation.\n\n{text}"
)

# Softened from the original: keeps the Gen-Z voice and humour, drops the
# explicit instruction to swear. See README for why this matters for review.
BRAINROT_PROMPT = (
    "Rewrite the following text in exaggerated Gen-Z internet slang "
    '("brainrot" style) — chaotic, over-the-top, funny. Keep it roughly the '
    "same length. Do not use profanity or slurs. Use the phrases below where "
    "they fit naturally. Return ONLY the rewritten text, with no preamble.\n\n"
    "Phrases:\n{phrases}\n\nText:\n{text}"
)


def _generate(prompt: str) -> str:
    try:
        response = client.models.generate_content(model=MODEL_ID, contents=prompt)
    except Exception as exc:
        # Full detail goes to the server log; only the exception type goes to
        # the client, so a stack trace can't leak the API key.
        print(f"[gemini] {type(exc).__name__}: {exc}", flush=True)
        raise HTTPException(
            status_code=502,
            detail=f"AI service error ({type(exc).__name__}). Check the server log.",
        )

    text = (response.text or "").strip()
    if not text:
        # Usually means a safety filter blocked the response.
        print(f"[gemini] empty response; feedback={getattr(response, 'prompt_feedback', None)}", flush=True)
        raise HTTPException(
            status_code=502, detail="The model returned nothing (possibly filtered)."
        )
    return text


# --- Routes -----------------------------------------------------------------


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/transform")
@limiter.limit("20/minute")
def transform_text(request: Request, req: TextRequest):
    return {"result": _generate(SHAKESPEARE_PROMPT.format(text=req.text))}


@app.post("/brainrot")
@limiter.limit("20/minute")
def transform_brainrot(request: Request, req: TextRequest):
    return {
        "result": _generate(
            BRAINROT_PROMPT.format(phrases=BRAINROT_PHRASES, text=req.text)
        )
    }
