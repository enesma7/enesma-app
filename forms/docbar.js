export const OFFICE_DOCS_URL = "https://agent.enesmarealty.com/#/compliance/office-documents";

export function shouldUseHistoryBack(referrer, historyLength) {
  if (!(historyLength > 1) || !referrer) return false;
  let url;
  try {
    url = new URL(referrer);
  } catch (e) {
    return false;
  }
  if (url.hostname === "agent.enesmarealty.com") return true;
  if (url.hostname === "app.enesmarealty.com") {
    return url.pathname === "/hub" || url.pathname.startsWith("/hub/");
  }
  return false;
}

export function pageShareUrl(href) {
  const url = new URL(href);
  url.hash = "";
  return url.href;
}

function docTitle() {
  const heading = document.querySelector("header h1");
  const text = heading && heading.textContent ? heading.textContent.trim() : "";
  return text || document.title;
}

function toast(message) {
  let el = document.getElementById("docToast");
  if (!el) {
    el = document.createElement("div");
    el.id = "docToast";
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    document.body.appendChild(el);
  }
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => el.classList.remove("show"), 2200);
}

function copyWithExec(text) {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;outline:none;box-shadow:none;background:transparent";
  document.body.appendChild(area);
  area.focus();
  area.select();
  area.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch (e) {
    ok = false;
  }
  area.remove();
  return ok;
}

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (e) {
      /* use the execCommand fallback */
    }
  }
  return copyWithExec(text);
}

function showCopyBox(url) {
  let box = document.getElementById("docCopy");
  if (!box) {
    box = document.createElement("div");
    box.id = "docCopy";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", "Copy link");
    box.innerHTML = '<p>Copy this link</p><input type="url" readonly aria-label="Document link"><div class="row"><button type="button" id="docCopyBtn">Copy</button><button type="button" class="ghost" id="docCopyClose">Close</button></div>';
    document.body.appendChild(box);
    box.querySelector("#docCopyClose").addEventListener("click", () => box.remove());
    box.querySelector("#docCopyBtn").addEventListener("click", async () => {
      const input = box.querySelector("input");
      const copied = await copyText(input.value);
      if (copied) {
        box.remove();
        toast("Link copied");
      } else {
        input.focus();
        input.select();
      }
    });
  }
  const input = box.querySelector("input");
  input.value = url;
  input.focus();
  input.select();
}

async function onShare() {
  const url = pageShareUrl(location.href);
  const title = docTitle();
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  const copied = await copyText(url);
  if (copied) toast("Link copied");
  else showCopyBox(url);
}

function goOfficeDocs() {
  try {
    if (window.top && window.top !== window) {
      window.top.location.href = OFFICE_DOCS_URL;
      return;
    }
  } catch (e) {
    /* framed by another origin: leave this frame */
  }
  location.href = OFFICE_DOCS_URL;
}

function onBack(event) {
  if (event.defaultPrevented || event.button !== 0) return;
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  if (!shouldUseHistoryBack(document.referrer, history.length)) return;
  event.preventDefault();
  let left = false;
  const markLeft = () => { left = true; };
  window.addEventListener("pagehide", markLeft, { once: true });
  history.back();
  window.setTimeout(() => {
    window.removeEventListener("pagehide", markLeft);
    if (!left) goOfficeDocs();
  }, 600);
}

function bindDocbar() {
  const back = document.getElementById("back");
  if (back) {
    if (!back.getAttribute("href")) back.setAttribute("href", OFFICE_DOCS_URL);
    back.addEventListener("click", onBack);
  }
  const share = document.getElementById("share");
  if (share) {
    share.addEventListener("click", () => {
      onShare().catch(() => showCopyBox(pageShareUrl(location.href)));
    });
  }
}

if (typeof document !== "undefined") bindDocbar();
