export function buildObserverScript(bindingName: string): string {
  return `
    (() => {
      if (window.__douyinLiveWelcomeObserverInstalled) {
        return;
      }

      const binding = window[${JSON.stringify(bindingName)}];
      if (typeof binding !== "function") {
        return;
      }

      window.__douyinLiveWelcomeObserverInstalled = true;
      window.__douyinLiveWelcomeObserverReady = false;

      const normalize = (value) => String(value ?? "").replace(/\\s+/g, " ").trim();

      const pushCandidate = (value, bucket) => {
        const text = normalize(value);
        if (!text || text.length > 120) {
          return;
        }
        bucket.push(text);
      };

      const collectTexts = (node, bucket) => {
        if (!node) {
          return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          pushCandidate(node.textContent, bucket);
          return;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) {
          return;
        }

        const element = node;
        pushCandidate(element.innerText || element.textContent, bucket);

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          pushCandidate(walker.currentNode.textContent, bucket);
        }
      };

      const emit = (bucket) => {
        const unique = [...new Set(bucket.map((value) => normalize(value)).filter(Boolean))];
        if (unique.length > 0) {
          binding(unique);
        }
      };

      const observer = new MutationObserver((mutations) => {
        const bucket = [];

        for (const mutation of mutations) {
          for (const node of mutation.addedNodes) {
            collectTexts(node, bucket);
          }

          if (mutation.type === "characterData") {
            collectTexts(mutation.target, bucket);
          }
        }

        emit(bucket);
      });

      const start = () => {
        if (!document.body) {
          requestAnimationFrame(start);
          return;
        }

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          characterData: true
        });
        window.__douyinLiveWelcomeObserverReady = true;
      };

      start();
      window.addEventListener("beforeunload", () => observer.disconnect(), { once: true });
    })();
  `;
}
