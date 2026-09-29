/*
  J.S. Bach, Prelude No. 1 in C Major, BWV 846.
  Performance by Kimiko Ishizaka, released under CC0 1.0.
  The local audio file starts on the first user gesture because browsers
  generally block audible autoplay. Volume controls hide after scrolling.
*/

(function () {
  "use strict";

  const TRACK = "audio/bach-prelude-c-major-bwv846.mp3";

  let audio = null;
  let targetVol = 0.5;
  let muted = false;

  function build() {
    audio = new Audio(TRACK);
    audio.id = "backgroundMusic";
    audio.hidden = true;
    audio.setAttribute("aria-hidden", "true");
    audio.loop = true;
    audio.preload = "auto";
    audio.volume = 0;
    document.body.appendChild(audio);
  }

  function applyVol() {
    if (!audio) return;
    audio.volume = muted ? 0 : Math.min(1, targetVol * 0.7);
  }

  function start() {
    if (!audio) build();
    applyVol();
    const attempt = audio.play();
    if (attempt) attempt.catch(() => {});
  }

  function setIcon(btn) {
    btn.innerHTML = muted
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><line x1="22" y1="9" x2="16" y2="15"/><line x1="16" y1="9" x2="22" y2="15"/></svg>'
      : '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/></svg>';
    btn.setAttribute("aria-label", muted ? "Unmute music" : "Mute music");
  }

  function init() {
    const wrap = document.getElementById("vol");
    const btn = document.getElementById("volBtn");
    const range = document.getElementById("volRange");
    if (!wrap || !btn || !range) return;

    targetVol = parseFloat(range.value);
    setIcon(btn);

    range.addEventListener("input", () => {
      targetVol = parseFloat(range.value);
      if (targetVol > 0 && muted) muted = false;
      setIcon(btn);
      start();
    });

    btn.addEventListener("click", () => {
      muted = !muted;
      setIcon(btn);
      start();
    });

    const kick = () => {
      start();
      off();
    };
    const off = () => ["pointerdown", "keydown", "touchstart", "wheel"].forEach((event) =>
      window.removeEventListener(event, kick));
    ["pointerdown", "keydown", "touchstart", "wheel"].forEach((event) =>
      window.addEventListener(event, kick, { passive: true }));

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        wrap.classList.toggle("hidden", window.scrollY > 60);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    start();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
