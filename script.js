(function () {
  "use strict";

  var data = window.GALLERY_DATA || { title: "", subtitle: "", items: [] };
  var items = data.items || [];

  // Optional site title/subtitle overrides from gallery-data.js
  if (data.title) document.getElementById("siteTitle").textContent = data.title;
  if (data.subtitle)
    document.getElementById("siteSubtitle").textContent = data.subtitle;

  document.getElementById("year").textContent = new Date().getFullYear();

  var gallery = document.getElementById("gallery");
  var emptyState = document.getElementById("emptyState");

  if (!items.length) {
    emptyState.hidden = false;
    return;
  }

  // Build cards
  items.forEach(function (item, index) {
    var card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.setAttribute("aria-label", "Open " + (item.title || "image"));

    var img = document.createElement("img");
    img.src = item.src;
    img.alt = item.title || "";
    img.loading = "lazy";
    card.appendChild(img);

    if (item.title || item.description) {
      var cap = document.createElement("div");
      cap.className = "card-caption";
      if (item.title) {
        var t = document.createElement("p");
        t.className = "card-title";
        t.textContent = item.title;
        cap.appendChild(t);
      }
      if (item.description) {
        var d = document.createElement("p");
        d.className = "card-desc";
        d.textContent = item.description;
        cap.appendChild(d);
      }
      card.appendChild(cap);
    }

    card.addEventListener("click", function () {
      openLightbox(index);
    });
    gallery.appendChild(card);
  });

  // Lightbox
  var lightbox = document.getElementById("lightbox");
  var lbImg = document.getElementById("lbImg");
  var lbCaption = document.getElementById("lbCaption");
  var current = 0;

  function show(index) {
    current = (index + items.length) % items.length;
    var item = items[current];
    lbImg.src = item.src;
    lbImg.alt = item.title || "";
    lbCaption.textContent = item.title || "";
  }

  function openLightbox(index) {
    show(index);
    lightbox.hidden = false;
    lightbox.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightbox.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  document.getElementById("lbClose").addEventListener("click", closeLightbox);
  document.getElementById("lbNext").addEventListener("click", function () {
    show(current + 1);
  });
  document.getElementById("lbPrev").addEventListener("click", function () {
    show(current - 1);
  });

  lightbox.addEventListener("click", function (e) {
    if (e.target === lightbox) closeLightbox();
  });

  document.addEventListener("keydown", function (e) {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    else if (e.key === "ArrowRight") show(current + 1);
    else if (e.key === "ArrowLeft") show(current - 1);
  });
})();
