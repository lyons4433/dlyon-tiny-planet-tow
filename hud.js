(function () {
  const hud = document.querySelector(".hud");
  const jobPanel = document.querySelector(".job-panel");
  const intro = document.getElementById("intro");
  const shop = document.getElementById("shop");
  const startButton = document.getElementById("startGame");
  const nextTowButton = document.getElementById("nextTow");

  if (!hud || !jobPanel) return;

  let collapseTimer = null;

  function isPlaying() {
    return intro?.classList.contains("hidden") && shop?.classList.contains("hidden");
  }

  function setExpanded(expanded) {
    hud.classList.toggle("hud-collapsed", !expanded);
    hud.setAttribute("aria-expanded", expanded ? "true" : "false");
  }

  function clearCollapseTimer() {
    if (collapseTimer) window.clearTimeout(collapseTimer);
    collapseTimer = null;
  }

  function collapseSoon(delay = 4200) {
    clearCollapseTimer();
    if (!isPlaying()) {
      setExpanded(true);
      return;
    }

    collapseTimer = window.setTimeout(() => {
      if (isPlaying()) setExpanded(false);
    }, delay);
  }

  function expandTemporarily(delay = 5200) {
    setExpanded(true);
    collapseSoon(delay);
  }

  hud.setAttribute("aria-expanded", "true");
  jobPanel.setAttribute("role", "button");
  jobPanel.setAttribute("tabindex", "0");
  jobPanel.setAttribute("aria-label", "Expand mission information");

  hud.addEventListener("click", (event) => {
    if (!hud.classList.contains("hud-collapsed")) {
      if (isPlaying()) collapseSoon();
      return;
    }

    event.stopPropagation();
    expandTemporarily();
  });

  jobPanel.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    expandTemporarily();
  });

  startButton?.addEventListener("click", () => {
    window.setTimeout(() => collapseSoon(), 250);
  });

  nextTowButton?.addEventListener("click", () => {
    window.setTimeout(() => collapseSoon(), 250);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key.toLowerCase() === "h" && isPlaying()) {
      expandTemporarily();
    }
  });

  window.setInterval(() => {
    if (!isPlaying()) {
      clearCollapseTimer();
      setExpanded(true);
      return;
    }

    if (!hud.classList.contains("hud-collapsed") && !collapseTimer) {
      collapseSoon();
    }
  }, 600);
})();
