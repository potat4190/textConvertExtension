// AI Inline — content script.
//
// Fixed from the original:
//   1. The mousedown handler referenced `floatingBtn`, which was never
//      declared. That threw a ReferenceError on every click on every page,
//      so the buttons never disappeared when you clicked away.
//   2. Removed the clipboard round-trip. It read the user's clipboard, which
//      requires the clipboardRead permission and a privacy justification in
//      Web Store review. setRangeText / insertText already handled every
//      case, so the clipboard path was doing nothing but adding risk.
//   3. Network calls moved to the service worker (see background.js).
//   4. Errors now surface on the button instead of only in the console.

let btnContainer = null;
let currentRange = null;

const STYLES = [
  { id: "shakespeare-btn", label: "Shakespeare ✨", style: "shakespeare" },
  { id: "brainrot-btn", label: "Brainrot 🫠", style: "brainrot" },
];

function editableAncestor(node) {
  const el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
  if (!el) return null;
  return {
    input: el.closest("textarea, input"),
    editable: el.closest("[contenteditable='true']"),
  };
}

function replaceSelectedText(range, newText) {
  const targets = editableAncestor(range.startContainer);
  if (!targets) return;

  // CASE 1: <input> / <textarea>
  if (targets.input) {
    const input = targets.input;
    input.focus();
    const start = input.selectionStart;
    const end = input.selectionEnd;
    input.setRangeText(newText, start, end, "end");
    // Let frameworks (React, Vue) notice the change.
    input.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }

  // CASE 2: contenteditable
  if (targets.editable) {
    targets.editable.focus();
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    document.execCommand("insertText", false, newText);
    return;
  }

  // CASE 3: plain DOM fallback
  range.deleteContents();
  range.insertNode(document.createTextNode(newText));
}

function makeBtn({ id, label, style }) {
  const b = document.createElement("div");
  b.className = "ai-btn";
  b.id = id;
  b.innerText = label;

  b.onmousedown = (e) => e.preventDefault(); // don't drop the selection

  b.onclick = async () => {
    if (!currentRange) return;

    const range = currentRange;
    const selectedText = range.toString().trim();
    if (!selectedText) return;

    const original = b.innerText;
    b.innerText = "Thinking…";
    b.classList.add("ai-btn-busy");

    let response;
    try {
      response = await chrome.runtime.sendMessage({
        type: "transform",
        style,
        text: selectedText,
      });
    } catch {
      response = { ok: false, error: "Extension was reloaded — refresh the page." };
    }

    if (!response?.ok) {
      b.innerText = response?.error || "Something went wrong";
      b.classList.remove("ai-btn-busy");
      b.classList.add("ai-btn-error");
      setTimeout(() => {
        b.innerText = original;
        b.classList.remove("ai-btn-error");
      }, 2500);
      return;
    }

    replaceSelectedText(range, response.result);
    window.getSelection().removeAllRanges();
    removeButtons();
  };

  return b;
}

function createButtons() {
  btnContainer = document.createElement("div");
  btnContainer.id = "ai-btns-container";
  STYLES.forEach((s) => btnContainer.appendChild(makeBtn(s)));
  document.body.appendChild(btnContainer);
}

function removeButtons() {
  if (!btnContainer) return;
  btnContainer.remove();
  btnContainer = null;
  currentRange = null;
}

document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || !selection.rangeCount) {
    removeButtons();
    return;
  }

  const range = selection.getRangeAt(0);
  const targets = editableAncestor(range.startContainer);

  // Only offer to rewrite where we can actually write back.
  if (!targets || (!targets.input && !targets.editable)) {
    removeButtons();
    return;
  }

  currentRange = range;
  if (!btnContainer) createButtons();

  const rect = range.getBoundingClientRect();
  btnContainer.style.top = `${rect.bottom + window.scrollY + 5}px`;
  btnContainer.style.left = `${rect.left + window.scrollX}px`;
});

// FIXED: was `floatingBtn`, which didn't exist.
document.addEventListener("mousedown", (e) => {
  if (btnContainer && !btnContainer.contains(e.target)) {
    removeButtons();
  }
});

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") removeButtons();
});
