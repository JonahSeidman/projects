/* Jonah Seidman — projects progression. Data-driven render + lightbox + scrollspy. */

const ERAS = [
  {
    id: "eighth-grade",
    num: "01",
    name: "8th Grade",
    note: "Where it started.",
    projects: [
      {
        title: "RFID Door Lock",
        media: [
          { type: "image", src: "images/rfid-1.png" },
          { type: "image", src: "images/rfid-2.png" },
          { type: "video", src: "images/rfid.mp4" },
        ],
      },
    ],
  },
  {
    id: "personal",
    num: "02",
    name: "Personal Projects",
    note: "Building for the fun of it.",
    projects: [
      {
        title: "Homemade FPV Drone",
        media: [
          { type: "image", src: "images/drone-1.png" },
          { type: "image", src: "images/drone-2.jpg" },
        ],
      },
    ],
  },
  {
    id: "satellites",
    num: "03",
    name: "Satellites",
    note: "Pulling images down from orbit.",
    projects: [
      {
        title: "GOES Imagery",
        media: [
          { type: "image", src: "images/goes-1.png" },
          { type: "image", src: "images/goes-2.png" },
          { type: "image", src: "images/goes-3.png" },
        ],
      },
      {
        title: "Meteor-M3",
        media: [{ type: "image", src: "images/meteor.png" }],
      },
    ],
  },
  {
    id: "obd2",
    num: "04",
    name: "OBD-II Bluetooth Accessory",
    note: "An accessory device for the car.",
    projects: [
      {
        title: "",
        media: [{ type: "image", src: "images/obd2.png" }],
      },
    ],
  },
  {
    id: "boat",
    num: "05",
    name: "Boat Work",
    note: "Where most of my time goes now.",
    projects: [
      {
        title: "The Boat",
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
  meta.appendChild(el("span", "era-num", era.num));
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
  const navLinks = document.getElementById("navLinks");
  ERAS.forEach((era) => {
    timeline.appendChild(eraNode(era));
    const link = el("a", "nav-link", era.name);
    link.href = "#era-" + era.id;
    link.dataset.target = "era-" + era.id;
    navLinks.appendChild(link);
  });
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

  const links = document.querySelectorAll(".nav-link");
  const spy = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          links.forEach((l) =>
            l.classList.toggle("active", l.dataset.target === en.target.id)
          );
        }
      });
    },
    { rootMargin: "-45% 0px -50% 0px" }
  );
  document.querySelectorAll(".era").forEach((n) => spy.observe(n));

  // condense nav after leaving hero
  const nav = document.getElementById("nav");
  const hero = document.getElementById("top");
  new IntersectionObserver(
    ([e]) => nav.classList.toggle("nav--solid", !e.isIntersecting),
    { rootMargin: "-70px 0px 0px 0px" }
  ).observe(hero);
}

/* ---------- init ---------- */

render();
wireObservers();
document.getElementById("year").textContent = new Date().getFullYear();
