// Gemini Canvas RTL for Hebrew
// Automatically sets paragraph direction to RTL when Hebrew text is detected.
// Uses dynamic CSS injection because ProseMirror strips inline styles and attributes on re-render.

const HEBREW_RANGE = /[\u0590-\u05FF]/;
const BLOCK_TAGS = 'p, h1, h2, h3, h4, h5, h6, li, blockquote';

function isHebrew(text) {
  const stripped = text.replace(/[\s\d\p{P}\p{S}]/gu, '');
  if (!stripped) return false;
  return HEBREW_RANGE.test(stripped.charAt(0));
}

// Inject a persistent style element that ProseMirror cannot strip
let styleEl = document.createElement('style');
styleEl.id = 'gemini-rtl-hebrew';
document.head.appendChild(styleEl);

function processCanvas() {
  const editors = document.querySelectorAll(
    'immersive-editor .ProseMirror, .immersive-editor .ProseMirror'
  );
  if (!editors.length) {
    // No canvas open — clear rules
    if (styleEl.textContent) styleEl.textContent = '';
    return;
  }

  const rules = [];

  editors.forEach((editor) => {
    const children = editor.children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const tag = child.tagName.toLowerCase();
      // Only target known block-level text elements
      if (!child.matches(BLOCK_TAGS)) continue;

      if (isHebrew(child.textContent)) {
        // nth-child is 1-based
        rules.push(
          `immersive-editor .ProseMirror > ${tag}:nth-child(${i + 1}) { direction: rtl !important; text-align: right !important; unicode-bidi: plaintext !important; }`
        );
      }
    }
  });

  const css = rules.join('\n');
  // Avoid unnecessary DOM writes
  if (styleEl.textContent !== css) {
    styleEl.textContent = css;
  }
}

// Observe the DOM for canvas panel appearing and text changes within it
const observer = new MutationObserver((mutations) => {
  let shouldProcess = false;
  for (const mutation of mutations) {
    if (mutation.type === 'childList') {
      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          if (
            node.matches?.('immersive-editor, immersive-panel') ||
            node.querySelector?.('immersive-editor, .ProseMirror')
          ) {
            shouldProcess = true;
            break;
          }
        }
      }
    }
    if (mutation.type === 'characterData' || mutation.type === 'childList') {
      const target = mutation.target;
      if (
        target.closest?.('.ProseMirror') &&
        target.closest?.('immersive-editor, .immersive-editor')
      ) {
        shouldProcess = true;
      }
    }
    if (shouldProcess) break;
  }
  if (shouldProcess) {
    processCanvas();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
  characterData: true,
});

// Periodic fallback for streaming text from Gemini
setInterval(processCanvas, 500);

// Initial run
processCanvas();
