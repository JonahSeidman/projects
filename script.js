/* Jonah Seidman — projects progression. Data-driven render + lightbox + scrollspy. */

const ERAS = [
  {
    id: "eighth-grade",
    num: "01",
    name: "8th Grade",
    age: "12–13",
    projects: [
      {
        title: "RFID Door Lock",
        media: [
          { type: "image", src: "images/rfid-1.png", caption: "Age 13" },
          { type: "image", src: "images/rfid-2.png", caption: "Age 13" },
          { type: "video", src: "images/rfid.mp4", caption: "Age 12" },
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
        title: "Homemade FPV Drone",
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
        media: [
          { type: "image", src: "images/asr-1.png" },
          { type: "image", src: "images/asr-2.png" },
          { type: "image", src: "images/meteor.png" },
        ],
      },
      {
        title: "GOES Imagery",
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

function projectNode(p) {
  const proj = el("article", "project");
  if (p.title) proj.appendChild(el("h3", "project-title", p.title));

  const onlyVideo = p.media.length === 1 && p.media[0].type === "video";
  const single = p.media.length === 1;
  const grid = el(
    "div",
    "media-grid" + (single ? " media-grid--single" : "") + (onlyVideo ? " media-grid--video" : "")
  );
  p.media.forEach((m) => grid.appendChild(mediaNode(m)));
  proj.appendChild(grid);
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
  meta.appendChild(el("h2", "era-name", era.name));
  if (era.note) meta.appendChild(el("p", "era-note", era.note));
  head.appendChild(meta);
  section.appendChild(head);

  const body = el("div", "era-body");
  era.projects.forEach((p) => body.appendChild(projectNode(p)));
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
