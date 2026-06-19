/* Jonah Seidman — projects progression. Data-driven render + lightbox + scrollspy. */

const ERAS = [
  {
    id: "eighth-grade",
    num: "01",
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
    id: "personal",
    num: "03",
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
    num: "04",
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
    id: "satellites",
    num: "05",
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
  if (item.type === "video") {
    const wrap = el("figure", "media media-video");
    const v = document.createElement("video");
    v.src = item.src;
    v.muted = true;
    v.loop = true;
    v.autoplay = true;
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    v.setAttribute("muted", "");
    v.setAttribute("preload", "metadata");
    v.controls = false;
    wrap.appendChild(v);
    if (item.caption) wrap.appendChild(el("figcaption", "media-cap", item.caption));
    return wrap;
  }
  const wrap = el("figure", "media media-image");
  const img = document.createElement("img");
  img.src = item.src;
  img.alt = "";
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
  ERAS.forEach((era) => timeline.appendChild(eraNode(era)));
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
