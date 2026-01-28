/* =========================================================
   THE J3SS EXPRESS — SCRIPT
   Ultra-realistic “train” ambience: sparks + embers + subtle HUD
   ========================================================= */

(() => {
  const $ = (q, el = document) => el.querySelector(q);

  // ---- Elements
  const yearEl = $("#year");
  const timeEl = $("#localTime");
  const audio = $("#ambience");
  const audioToggle = $("#audioToggle");
  const shareBtn = $("#shareBtn");
  const copyBtn = $("#copyBtn");
  const form = $("#contactForm");
  const formNote = $("#formNote");

  // Canvases
  const sparksCanvas = $("#sparks");
  const embersCanvas = $("#embers");

  // ---- Basic utilities
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const rand = (a, b) => a + Math.random() * (b - a);

  // ---- Year
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  // ---- Clock
  function tickClock() {
    if (!timeEl) return;
    const d = new Date();
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    timeEl.textContent = `${hh}:${mm}`;
  }
  tickClock();
  setInterval(tickClock, 10_000);

  // ---- Reduced motion
  const prefersReduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- Audio toggle (optional)
  async function setAudio(on) {
    if (!audio || !audioToggle) return;
    try {
      if (on) {
        await audio.play();
        audioToggle.setAttribute("aria-pressed", "true");
        audioToggle.classList.add("is-on");
      } else {
        audio.pause();
        audio.currentTime = 0;
        audioToggle.setAttribute("aria-pressed", "false");
        audioToggle.classList.remove("is-on");
      }
    } catch (e) {
      // Autoplay restrictions may block; we keep it silent.
      audioToggle.setAttribute("aria-pressed", "false");
      audioToggle.classList.remove("is-on");
    }
  }

  if (audioToggle && audio) {
    audio.volume = 0.45;
    audioToggle.addEventListener("click", () => {
      const isOn = audioToggle.getAttribute("aria-pressed") === "true";
      setAudio(!isOn);
    });
  }

  // ---- Share + Copy
  if (shareBtn) {
    shareBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      const data = {
        title: document.title,
        text: "The J3ss Express — Link Hub",
        url: location.href,
      };
      if (navigator.share) {
        try {
          await navigator.share(data);
        } catch (_) {}
      } else {
        // fallback: copy
        try {
          await navigator.clipboard.writeText(location.href);
          flashNote("Copied page link.");
        } catch (_) {
          flashNote("Copy not available.");
        }
      }
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener("click", async (e) => {
      e.preventDefault();
      // Collect all link URLs from the page
      const urls = [...document.querySelectorAll("a[href]")]
        .map((a) => a.href)
        .filter((u) => u && !u.startsWith("javascript:"));
      const text = urls.join("\n");
      try {
        await navigator.clipboard.writeText(text);
        flashNote("Copied all links.");
      } catch (_) {
        flashNote("Copy not available.");
      }
    });
  }

  function flashNote(msg) {
    if (!formNote) return;
    const old = formNote.textContent;
    formNote.textContent = msg;
    formNote.style.opacity = "1";
    setTimeout(() => {
      formNote.textContent = old;
    }, 1400);
  }

  // ---- Fake form submit (front-end only)
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      flashNote("Captured locally — connect this to email/webhook next.");
      form.reset();
    });
  }

  // =========================================================
  // Canvas FX: SPARKS + EMBERS (train rails vibe)
  // =========================================================

  if (!prefersReduced) {
    // Setup canvases
    const ctxS = sparksCanvas?.getContext("2d", { alpha: true });
    const ctxE = embersCanvas?.getContext("2d", { alpha: true });

    let w = 0,
      h = 0,
      dpr = 1;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;

      if (sparksCanvas) {
        sparksCanvas.width = Math.floor(w * dpr);
        sparksCanvas.height = Math.floor(h * dpr);
        sparksCanvas.style.width = `${w}px`;
        sparksCanvas.style.height = `${h}px`;
      }
      if (embersCanvas) {
        embersCanvas.width = Math.floor(w * dpr);
        embersCanvas.height = Math.floor(h * dpr);
        embersCanvas.style.width = `${w}px`;
        embersCanvas.style.height = `${h}px`;
      }

      if (ctxS) ctxS.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (ctxE) ctxE.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    window.addEventListener("resize", resize, { passive: true });

    // Particles
    const sparks = [];
    const embers = [];

    // Spawn zones (lower third, near "rails")
    function spawnSpark() {
      const yBase = h * rand(0.62, 0.86);
      sparks.push({
        x: rand(-40, w * 0.35),
        y: yBase + rand(-20, 20),
        vx: rand(3.5, 8.5),
        vy: rand(-1.2, 0.9),
        life: rand(26, 50),
        size: rand(1.2, 2.4),
        hue: rand(180, 300), // cyan -> purple -> pink
        alpha: rand(0.5, 0.95),
      });
    }

    function spawnEmber() {
      const yBase = h * rand(0.55, 0.9);
      embers.push({
        x: rand(w * 0.05, w * 0.95),
        y: yBase + rand(-20, 20),
        vx: rand(-0.25, 0.25),
        vy: rand(-0.7, -0.15),
        life: rand(180, 380),
        size: rand(0.8, 2.2),
        hue: rand(35, 60), // amber
        alpha: rand(0.12, 0.35),
        tw: rand(0.004, 0.014),
      });
    }

    // Density based on device
    const mobile = /Mobi|Android/i.test(navigator.userAgent);
    const sparkRate = mobile ? 2 : 4; // per frame cap via RNG
    const emberTarget = mobile ? 55 : 95;

    // Pre-fill embers
    for (let i = 0; i < emberTarget; i++) spawnEmber();

    // Mouse influence (subtle)
    let mx = w * 0.5,
      my = h * 0.7;
    window.addEventListener(
      "pointermove",
      (e) => {
        mx = e.clientX;
        my = e.clientY;
      },
      { passive: true }
    );

    // Animation
    function frame() {
      // Clear
      if (ctxS) ctxS.clearRect(0, 0, w, h);
      if (ctxE) ctxE.clearRect(0, 0, w, h);

      // Spawn sparks stochastically
      if (Math.random() < 0.45) {
        const n = Math.floor(rand(1, sparkRate + 1));
        for (let i = 0; i < n; i++) spawnSpark();
      }

      // ---- Draw sparks
      if (ctxS) {
        for (let i = sparks.length - 1; i >= 0; i--) {
          const p = sparks[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.03; // gravity
          p.life -= 1;
          p.alpha *= 0.985;

          // trail line
          ctxS.beginPath();
          ctxS.strokeStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha})`;
          ctxS.lineWidth = p.size;
          ctxS.moveTo(p.x, p.y);
          ctxS.lineTo(p.x - p.vx * 2.2, p.y - p.vy * 2.2);
          ctxS.stroke();

          // glow point
          ctxS.beginPath();
          ctxS.fillStyle = `hsla(${p.hue}, 100%, 75%, ${p.alpha})`;
          ctxS.arc(p.x, p.y, p.size * 1.2, 0, Math.PI * 2);
          ctxS.fill();

          if (p.life <= 0 || p.x > w + 80 || p.y > h + 80) {
            sparks.splice(i, 1);
          }
        }
      }

      // ---- Draw embers
      if (ctxE) {
        for (let i = embers.length - 1; i >= 0; i--) {
          const p = embers[i];

          // gentle turbulence
          const sway =
            Math.sin((p.y + performance.now() * 0.06) * p.tw) * 0.25;

          // subtle pull towards pointer for "interactive air"
          const dx = mx - p.x;
          const dy = my - p.y;
          const dist = Math.max(80, Math.hypot(dx, dy));
          const pull = 24 / dist;

          p.x += p.vx + sway + dx * pull * 0.0025;
          p.y += p.vy + dy * pull * 0.001;
          p.life -= 1;

          const a = clamp(
            p.alpha * (0.6 + 0.4 * Math.sin(performance.now() * p.tw)),
            0.05,
            0.42
          );

          ctxE.beginPath();
          ctxE.fillStyle = `hsla(${p.hue}, 100%, 60%, ${a})`;
          ctxE.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctxE.fill();

          // respawn
          if (p.life <= 0 || p.y < -60 || p.x < -80 || p.x > w + 80) {
            embers.splice(i, 1);
            spawnEmber();
          }
        }
      }

      requestAnimationFrame(frame);
    }

    // Safety: if canvases missing, no loop
    if ((sparksCanvas && ctxS) || (embersCanvas && ctxE)) {
      requestAnimationFrame(frame);
    }
  }

  // Optional: auto-enable ambience after first user interaction
  // (keeps autoplay rules happy)
  if (audio && audioToggle) {
    const once = () => {
      // Only attempt if user wants; we do NOT force play.
      // Uncomment to auto-start: setAudio(true);
      window.removeEventListener("pointerdown", once);
      window.removeEventListener("keydown", once);
    };
    window.addEventListener("pointerdown", once, { passive: true });
    window.addEventListener("keydown", once);
  }
})();
