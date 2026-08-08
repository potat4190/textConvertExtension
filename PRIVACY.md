# Privacy Policy — AI Inline

*Last updated: August 8, 2026*

## What the extension does with your data

When you select text and click one of the rewrite buttons, that selected text is sent to the extension's server, which forwards it to Google's Gemini API to generate the rewritten version. The result is sent back and written into the text field.

**That is the only data that leaves your browser, and it only happens when you click a button.**

## What is not collected

- No personal information — no name, email, or account
- No browsing history, page contents, or URLs
- No analytics or tracking of any kind
- No cookies or identifiers
- Nothing is stored on the server. Selected text is held in memory for the duration of the request and then discarded. There are no logs of it.

## Third parties

Selected text is processed by **Google's Gemini API** solely to generate the rewrite. Google's handling of that data is governed by the [Google APIs Terms of Service](https://developers.google.com/terms) and the [Google Privacy Policy](https://policies.google.com/privacy).

No data is sold, shared, or transferred to anyone else.

## A practical note

Because your selected text is sent to a third-party AI service, **don't use this on passwords, financial details, medical information, or anything else confidential.** This is a small personal project, not a service with security guarantees.

## Permissions and why they're needed

| Permission | Why |
|---|---|
| `activeTab` | Reads your text selection on the page, only when you click a rewrite button |
| Content script on all sites | So the buttons work in text fields anywhere — you choose where to use it |
| Host access to the extension's API | To send selected text for rewriting and receive the result |

## Contact

Questions, or want your concerns addressed: **rshrestha2@albany.edu**, or [open an issue](https://github.com/potat4190/textConvertExtension/issues).
