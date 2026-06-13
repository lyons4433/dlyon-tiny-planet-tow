(function () {
  const compassLabel = document.getElementById("compassLabel");
  const compassDistance = document.getElementById("compassDistance");
  const compassArrow = document.getElementById("compassArrow");

  if (!compassLabel || !compassDistance || !compassArrow || typeof updateCompass !== "function") return;

  function destination() {
    if (routeComplete) return { x: planet.x, y: planet.y, label: "Home base" };

    const target = currentTarget();
    const correctCargoAttached = cable.attached && target && cable.attached.id === target.id;

    if (!correctCargoAttached && target && !target.delivered) {
      return { x: target.x, y: target.y, label: "Tow target" };
    }

    const zone = currentDropZone();
    return { x: zone.x, y: zone.y, label: "Load zone" };
  }

  updateCompass = function () {
    const target = destination();
    if (!target) return;

    const dx = target.x - ship.x;
    const dy = target.y - ship.y;
    const angle = Math.atan2(dy, dx) + Math.PI / 2;
    const meters = Math.round(Math.hypot(dx, dy) / 10);

    compassArrow.style.transform = `translate(-50%, -68%) rotate(${angle}rad)`;
    compassLabel.textContent = target.label;
    compassDistance.textContent = `${meters}m`;
  };
})();
