/* Jonah Seidman — projects progression. Data-driven render + lightbox + scrollspy. */

const ERAS = [
  {
    id: "boat",
    num: "02",
    name: "Autonomous Sailboat",
    age: "14–present",
    projects: [
      {
        title: "",
        desc: "Sailboat with autonomous steering and sail control driven by onboard electronics. Ongoing build.",
        media: [
          { type: "image", src: "images/boat-1.png" },
          { type: "image", src: "images/boat-2.jpg" },
          { type: "image", src: "images/boat-3.jpg" },
          { type: "image", src: "images/boat-4.png" },
          { type: "image", src: "images/boat-5.png" },
          { type: "image", src: "images/boat-6.png" },
          { type: "image", src: "images/boat-7.png" },
        ],
      },
      {
        title: "Battery Management System",
        desc: "Overcurrent and undervoltage protection, per-cell voltage monitoring, and current sensing, with telemetry sent to a Raspberry Pi.",
        media: [
          { type: "image", src: "images/bms-1.jpg" },
          { type: "image", src: "images/bms-2.jpg" },
        ],
      },
      {
        title: "",
        media: [{ type: "video", src: "images/boat.mp4" }],
      },
    ],
  },
  {
    id: "rogers-lab",
    num: "01",
    featured: true,
    name: "John A. Rogers Lab Internship",
    age: "17 · Summer 2026",
    badge: {
      src: "images/northwestern-engineering-logo.png",
      alt: "Northwestern Engineering",
      label: "Internship",
    },
    projects: [
      {
        title: "Wireless Neonatal Health Monitoring",
        desc: "At Northwestern University's John A. Rogers Lab, I worked on the design and manufacturing of compact, wireless health-monitoring devices for neonates, including ECG sensors and wound-monitoring bandages. The goal was to make clinical monitoring smaller, wireless, and longer-lasting—reducing the bulky wired equipment that can limit access for clinicians and comfort for infants.",
        media: [
          {
            type: "image",
            src: "images/rogers-lab-device-assembly.jpg",
            caption: "Device assembly under inspection",
          },
          {
            type: "image",
            src: "images/rogers-lab-prototype-pair.jpg",
            caption: "Two compact wireless prototypes with batteries",
          },
          {
            type: "image",
            src: "images/rogers-lab-bench-testing.jpg",
            caption: "Electrical characterization and bench testing",
          },
          {
            type: "image",
            src: "images/rogers-lab-microscope-station.jpg",
            caption: "Microscope-assisted device inspection",
          },
          {
            type: "image",
            src: "images/rogers-lab-device-under-microscope.jpg",
            caption: "Device positioned for microscope inspection",
          },
          {
            type: "image",
            src: "images/rogers-lab-pcb-layout-1.png",
            caption: "Flexible PCB layout with remote sensor head",
          },
          {
            type: "image",
            src: "images/rogers-lab-pcb-layout-2.png",
            caption: "Multi-electrode wearable PCB layout",
          },
          {
            type: "image",
            src: "images/rogers-lab-pcb-layout-3.png",
            caption: "Compact flexible PCB layout",
          },
          {
            type: "video",
            src: "images/rogers-lab-0594.mp4",
            poster: "images/rogers-lab-0594-poster.jpg",
            caption: "Microscope inspection of flexible traces",
          },
          {
            type: "video",
            src: "images/rogers-lab-0607.mp4",
            poster: "images/rogers-lab-0607-poster.jpg",
            caption: "Microscope alignment during assembly",
          },
          {
            type: "video",
            src: "images/rogers-lab-0609.mp4",
            poster: "images/rogers-lab-0609-poster.jpg",
            caption: "Device fabrication process",
          },
          {
            type: "video",
            src: "images/rogers-lab-0616.mp4",
            poster: "images/rogers-lab-0616-poster.jpg",
            caption: "Powered device check",
          },
          {
            type: "document",
            src: "documents/rogers-lab/neoflux-v12.pdf",
            poster: "images/rogers-lab-neoflux-schematic.png",
            label: "NeoFlux v12",
            caption: "Open PDF schematic",
          },
          {
            type: "document",
            src: "documents/rogers-lab/neobloom-v1.pdf",
            poster: "images/rogers-lab-neobloom-schematic.png",
            label: "NeoBloom v1",
            caption: "Open PDF schematic",
          },
          {
            type: "document",
            src: "documents/rogers-lab/neobee-v21.pdf",
            poster: "images/rogers-lab-neobee-schematic.png",
            label: "NeoBee v21",
            caption: "Open PDF schematic",
          },
        ],
      },
    ],
  },
  {
    id: "muon-detector",
    num: "03",
    name: "Cosmic-Ray Muon Detector",
    age: "17–present",
    projects: [
      {
        title: "Coincidence Detector",
        desc: "Two scintillation detectors are stacked and monitored together. When both register a pulse within the same coincidence window, the event is counted as a candidate cosmic-ray muon, rejecting many single-detector background hits.",
        media: [
          {
            type: "image",
            src: "images/muon-detector-setup.jpeg",
            caption: "Two-detector coincidence setup",
          },
          {
            type: "image",
            src: "images/muon-count-rates.png",
            caption: "Coincidence count rate by detector orientation",
          },
          {
            type: "image",
            src: "images/muon-pulse-data.png",
            caption: "Recorded detector pulse data",
          },
        ],
      },
    ],
  },
  {
    id: "satellites",
    num: "04",
    name: "Satellites",
    age: "16–present",
    projects: [
      {
        title: "Meteor-M2",
        desc: "Imagery from Meteor-M polar-orbiting weather satellites, received with a backyard dish and decoded locally.",
        media: [
          { type: "image", src: "images/asr-1.png" },
          { type: "image", src: "images/asr-2.png" },
          { type: "image", src: "images/meteor.png" },
        ],
      },
      {
        title: "GOES Imagery",
        desc: "Imagery from GOES geostationary weather satellites, received and decoded with a backyard ground station.",
        media: [
          { type: "image", src: "images/goes-1.png" },
          { type: "image", src: "images/goes-2.png" },
          { type: "image", src: "images/goes-3.png" },
        ],
      },
    ],
  },
  {
    id: "personal",
    num: "05",
    name: "Personal Projects",
    age: "15",
    projects: [
      {
        title: "Homemade Drone",
        desc: "Scratch-built quadcopter — frame, motors, and flight controller. Flown line-of-sight, not FPV.",
        media: [
          { type: "image", src: "images/drone-1.png" },
          { type: "image", src: "images/drone-2.jpg" },
          { type: "image", src: "images/drone-3.jpg" },
        ],
      },
    ],
  },
  {
    id: "obd2",
    num: "06",
    name: "OBD-II Bluetooth Accessory",
    age: "14",
    projects: [
      {
        title: "",
        desc: "Plugs into a car's OBD-II port and streams live vehicle data over Bluetooth to a phone.",
        media: [{ type: "image", src: "images/obd2.png" }],
      },
    ],
  },
  {
    id: "eighth-grade",
    num: "07",
    name: "",
    age: "12–13",
    layout: "columns",
    projects: [
      {
        age: "12",
        title: "LED Array",
        desc: "LED array wired to switch on at the end of a Rube Goldberg machine's chain reaction.",
        media: [{ type: "video", src: "images/led.mp4" }],
      },
      {
        age: "13",
        title: "RFID Door Lock",
        desc: "RFID lock. A reader scans a tag, checks it against an allowlist, and actuates the lock for authorized tags.",
        media: [
          { type: "image", src: "images/rfid-1.png" },
          { type: "image", src: "images/rfid-2.png" },
        ],
      },
    ],
  },
];

/* ---------- render ---------- */

const lightboxImages = []; // flat list of {src} for lightbox navigation

function el(tag, cls, html) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
}

function mediaNode(item) {
  if (item.type === "document") {
    const link = el("a", "media media-document");
    link.href = item.src;
    link.target = "_blank";
    link.rel = "noopener";
    link.setAttribute("aria-label", (item.label || "Document") + " — open PDF");

    const img = document.createElement("img");
    img.src = item.poster;
    img.alt = item.label ? item.label + " schematic preview" : "PDF preview";
    img.loading = "lazy";
    img.decoding = "async";
    link.appendChild(img);

    const cap = el("div", "media-cap media-doc-cap");
    cap.appendChild(el("span", "media-doc-title", item.label || "PDF"));
    cap.appendChild(el("span", "media-doc-action", item.caption || "Open PDF"));
    link.appendChild(cap);
    return link;
  }
  if (item.type === "video") {
    const wrap = el("figure", "media media-video");
    const v = document.createElement("video");
    v.src = item.src;
    v.muted = true;
    v.loop = true;
    v.autoplay = false;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    v.setAttribute("preload", "metadata");
    if (item.poster) v.poster = item.poster;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    v.controls = !canHover;
    if (canHover) {
      const play = () => v.play().catch(() => {});
      wrap.addEventListener("mouseenter", play);
      wrap.addEventListener("mouseleave", () => v.pause());
      wrap.addEventListener("focusin", play);
      wrap.addEventListener("focusout", () => v.pause());
    }
    wrap.appendChild(v);
    if (item.caption) wrap.appendChild(el("figcaption", "media-cap", item.caption));
    return wrap;
  }
  const wrap = el("figure", "media media-image");
  const img = document.createElement("img");
  img.src = item.src;
  img.alt = item.alt || item.caption || "";
  img.loading = "lazy";
  img.decoding = "async";
  const idx = lightboxImages.length;
  lightboxImages.push({ src: item.src });
  img.addEventListener("click", () => openLightbox(idx));
  wrap.appendChild(img);
  if (item.caption) wrap.appendChild(el("figcaption", "media-cap", item.caption));
  return wrap;
}

function mediaGrid(media, columns) {
  const single = media.length === 1;
  const onlyVideo = single && media[0].type === "video";
  let cls = "media-grid";
  if (columns) cls += " age-col-grid";
  else cls += (single ? " media-grid--single" : "") + (onlyVideo ? " media-grid--video" : "");
  const grid = el("div", cls);
  media.forEach((m) => grid.appendChild(mediaNode(m)));
  return grid;
}

// click-to-expand context for a project (native <details>, styled)
function infoNode(p) {
  const d = el("details", "proj-info");
  const sum = el("summary", "proj-info-summary");
  sum.innerHTML =
    '<span class="proj-info-label">' + (p.title || "Details") +
    '</span><span class="chev" aria-hidden="true">⌄</span>';
  d.appendChild(sum);
  d.appendChild(el("div", "proj-info-body", "<p>" + p.desc + "</p>"));
  return d;
}

function projectNode(p, columns) {
  const proj = el("article", columns ? "project age-col" : "project");

  if (columns && p.age) proj.appendChild(el("h3", "age-col-head", "Age " + p.age));

  if (p.desc) proj.appendChild(infoNode(p));
  else if (p.title) proj.appendChild(el("h3", "project-title", p.title));

  proj.appendChild(mediaGrid(p.media, columns));
  return proj;
}

function eraNode(era) {
  const section = el("section", "era");
  section.id = "era-" + era.id;

  const head = el("div", "era-head");
  head.appendChild(el("span", "era-dot"));
  const meta = el("div", "era-meta");
  if (era.badge) {
    const badge = el("div", "era-badge");
    const badgeImg = document.createElement("img");
    badgeImg.src = era.badge.src;
    badgeImg.alt = era.badge.alt || "";
    badge.appendChild(badgeImg);
    if (era.badge.label) badge.appendChild(el("span", "era-badge-label", era.badge.label));
    meta.appendChild(badge);
  }
  const numLine = el("span", "era-num", era.num);
  if (era.age) numLine.appendChild(el("span", "era-age", "Age " + era.age));
  meta.appendChild(numLine);
  if (era.name) meta.appendChild(el("h2", "era-name", era.name));
  if (era.note) meta.appendChild(el("p", "era-note", era.note));
  head.appendChild(meta);
  section.appendChild(head);

  const columns = era.layout === "columns";
  const body = el("div", columns ? "age-cols" : "era-body");
  era.projects.forEach((p) => body.appendChild(projectNode(p, columns)));
  section.appendChild(body);
  return section;
}

function render() {
  const timeline = document.getElementById("timeline");
  const orderedEras = [
    ...ERAS.filter((era) => era.featured),
    ...ERAS.filter((era) => !era.featured),
  ];
  orderedEras.forEach((era) => timeline.appendChild(eraNode(era)));
}

/* ---------- lightbox ---------- */

let lbIndex = 0;
const lb = document.getElementById("lb");
const lbImg = document.getElementById("lbImg");

function openLightbox(i) {
  lbIndex = i;
  lbImg.src = lightboxImages[i].src;
  lb.hidden = false;
  lb.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}
function closeLightbox() {
  lb.hidden = true;
  lb.setAttribute("aria-hidden", "true");
  lbImg.src = "";
  document.body.style.overflow = "";
}
function step(d) {
  lbIndex = (lbIndex + d + lightboxImages.length) % lightboxImages.length;
  lbImg.src = lightboxImages[lbIndex].src;
}

document.getElementById("lbClose").addEventListener("click", closeLightbox);
document.getElementById("lbPrev").addEventListener("click", (e) => { e.stopPropagation(); step(-1); });
document.getElementById("lbNext").addEventListener("click", (e) => { e.stopPropagation(); step(1); });
lb.addEventListener("click", (e) => { if (e.target === lb) closeLightbox(); });
document.addEventListener("keydown", (e) => {
  if (lb.hidden) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowRight") step(1);
  else if (e.key === "ArrowLeft") step(-1);
});

/* ---------- scroll reveal + nav state ---------- */

function wireObservers() {
  const reveal = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          reveal.unobserve(en.target);
        }
      });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 0.08 }
  );
  document.querySelectorAll(".era, .project").forEach((n) => reveal.observe(n));
}

/* ---------- init ---------- */

render();
wireObservers();
document.getElementById("year").textContent = new Date().getFullYear();

// hero scroll cue: smooth-scroll to first era without adding a #hash to the URL
const heroCue = document.getElementById("heroCue");
if (heroCue) {
  heroCue.addEventListener("click", (e) => {
    e.preventDefault();
    const first = document.querySelector(".era");
    if (first) first.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

// contact: address is assembled in the browser so it never sits in the page
// source as plain text (keeps it out of reach of email-scraping bots)
const contactLink = document.getElementById("contactLink");
if (contactLink) {
  const user = ["jonah", "kais"].join("");
  const domain = ["gmail", "com"].join(".");
  contactLink.href = "mailto:" + user + "@" + domain;
}
