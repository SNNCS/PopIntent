const mismatch = document.querySelector("#mismatch-test");
const mismatchResult = document.querySelector("#mismatch-result");
const intentional = document.querySelector("#intentional-test");
const intentionalResult = document.querySelector("#intentional-result");
const armOverlay = document.querySelector("#arm-overlay");
const overlayResult = document.querySelector("#overlay-result");

mismatch.addEventListener("click", (event) => {
  event.preventDefault();
  const child = window.open("unexpected.html", "_blank");
  mismatchResult.textContent = "Checking whether the simulated unwanted tab stays open…";
  mismatchResult.dataset.state = "";
  window.setTimeout(() => {
    if (child === null) {
      mismatchResult.textContent = "The browser blocked the popup before PopIntent could inspect it.";
      mismatchResult.dataset.state = "attention";
    } else if (child.closed) {
      mismatchResult.textContent = "Protected: the mismatched tab was closed.";
      mismatchResult.dataset.state = "pass";
    } else {
      mismatchResult.textContent = "The simulated unwanted tab stayed open. Check that PopIntent is enabled.";
      mismatchResult.dataset.state = "attention";
    }
  }, 900);
});

intentional.addEventListener("click", () => {
  intentionalResult.textContent = "Waiting for the expected page…";
  intentionalResult.dataset.state = "";
});

window.addEventListener("message", (event) => {
  if (event.origin !== location.origin || event.data !== "popintent-expected-page") return;
  intentionalResult.textContent = "Compatible: the intentional tab remained open.";
  intentionalResult.dataset.state = "pass";
});

armOverlay.addEventListener("click", () => {
  const testControl = document.createElement("button");
  testControl.type = "button";
  testControl.textContent = "Click here to test the invisible layer";
  testControl.setAttribute("aria-label", "Visible control underneath the simulated overlay");
  Object.assign(testControl.style, {
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
    zIndex: "2147483645",
    width: "min(420px, calc(100vw - 40px))",
    minHeight: "110px",
    border: "0",
    borderRadius: "16px",
    color: "white",
    background: "#155eef",
    font: "700 16px system-ui",
    boxShadow: "0 22px 70px #10182855"
  });

  const overlay = document.createElement("a");
  overlay.href = "unexpected.html";
  overlay.target = "_blank";
  overlay.rel = "opener";
  overlay.textContent = "Simulated invisible popup link";
  overlay.setAttribute("aria-label", "Simulated invisible popup link");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483646",
    opacity: "0"
  });

  const cleanup = () => {
    overlay.remove();
    testControl.remove();
  };
  overlay.addEventListener("pointerdown", () => {
    window.setTimeout(() => {
      overlayResult.textContent = "The simulated hidden link was activated. Check that PopIntent is enabled.";
      overlayResult.dataset.state = "attention";
      cleanup();
    }, 500);
  }, { capture: true });
  testControl.addEventListener("click", () => {
    overlayResult.textContent = "Protected: the invisible layer was bypassed and the real control received your click.";
    overlayResult.dataset.state = "pass";
    cleanup();
  });
  document.body.append(testControl, overlay);
  overlayResult.textContent = "Overlay armed. Click the large blue control in the center.";
  overlayResult.dataset.state = "";
  window.setTimeout(cleanup, 8_000);
});
