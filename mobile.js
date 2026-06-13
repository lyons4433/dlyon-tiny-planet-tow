(function () {
  const stick = document.getElementById("touchStick");
  const knob = document.getElementById("touchKnob");
  const controls = document.querySelector(".touch-controls");
  const actionButtons = [...document.querySelectorAll("[data-touch-action]")];
  const holdButtons = [...document.querySelectorAll("[data-touch-hold]")];

  if (!stick || !knob || typeof keys === "undefined") return;

  const drive = { active: false, pointerId: null, x: 0, y: 0 };
  const driveKeys = ["w", "a", "s", "d"];
  const winchKeys = ["q", "e"];

  function setKey(key, enabled) {
    if (enabled) keys.add(key);
    else keys.delete(key);
  }

  function clearDrive() {
    driveKeys.forEach((key) => keys.delete(key));
  }

  function clearWinch() {
    winchKeys.forEach((key) => keys.delete(key));
  }

  function updateDriveKeys() {
    const deadZone = 0.22;
    setKey("w", drive.y < -deadZone);
    setKey("s", drive.y > deadZone);
    setKey("a", drive.x < -deadZone);
    setKey("d", drive.x > deadZone);

    if (Math.hypot(drive.x, drive.y) > deadZone && typeof pointer !== "undefined" && typeof ship !== "undefined") {
      pointer.worldX = ship.x + drive.x * 240;
      pointer.worldY = ship.y + drive.y * 240;
    }
  }

  function updateStick(clientX, clientY) {
    const rect = stick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = clientX - centerX;
    const rawY = clientY - centerY;
    const distance = Math.hypot(rawX, rawY);
    const limit = Math.max(34, rect.width * 0.36);
    const scale = distance > limit ? limit / distance : 1;
    const knobX = rawX * scale;
    const knobY = rawY * scale;

    drive.x = knobX / limit;
    drive.y = knobY / limit;
    knob.style.left = `calc(50% + ${knobX}px)`;
    knob.style.top = `calc(50% + ${knobY}px)`;
    updateDriveKeys();
  }

  function resetStick() {
    drive.active = false;
    drive.pointerId = null;
    drive.x = 0;
    drive.y = 0;
    knob.style.left = "50%";
    knob.style.top = "50%";
    clearDrive();
  }

  stick.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof ensureAudio === "function") ensureAudio();
    drive.active = true;
    drive.pointerId = event.pointerId;
    stick.setPointerCapture(event.pointerId);
    updateStick(event.clientX, event.clientY);
  });

  stick.addEventListener("pointermove", (event) => {
    if (!drive.active || event.pointerId !== drive.pointerId) return;
    event.preventDefault();
    event.stopPropagation();
    updateStick(event.clientX, event.clientY);
  });

  ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
    stick.addEventListener(eventName, (event) => {
      if (drive.pointerId !== null && event.pointerId !== drive.pointerId) return;
      resetStick();
    });
  });

  actionButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof ensureAudio === "function") ensureAudio();
      if (button.dataset.touchAction === "hook" && typeof toggleHook === "function") toggleHook();
      if (button.dataset.touchAction === "fire" && typeof fireBlaster === "function") fireBlaster();
    });
  });

  holdButtons.forEach((button) => {
    const key = button.dataset.touchHold === "winch-in" ? "q" : "e";
    const setHeld = (enabled) => {
      setKey(key, enabled);
      button.classList.toggle("pressed", enabled);
    };

    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (typeof ensureAudio === "function") ensureAudio();
      button.setPointerCapture(event.pointerId);
      setHeld(true);
    });

    ["pointerup", "pointercancel", "lostpointercapture"].forEach((eventName) => {
      button.addEventListener(eventName, () => setHeld(false));
    });
  });

  controls?.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      resetStick();
      clearWinch();
    }
  });
})();
