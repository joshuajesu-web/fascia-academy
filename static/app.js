// Progress is kept in this browser only. No accounts, no tracking.
(function () {
  var KEY = "fa-progress";
  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; }
  }
  function save(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
  }
  var progress = load();

  // Click-to-load YouTube embeds keep pages fast.
  document.querySelectorAll(".yt").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var f = document.createElement("iframe");
      f.src = btn.dataset.src;
      f.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      f.title = btn.getAttribute("aria-label");
      btn.innerHTML = "";
      btn.appendChild(f);
    }, { once: true });
  });

  document.querySelectorAll(".done-btn").forEach(function (btn) {
    function paint() {
      var done = !!progress[btn.dataset.key];
      btn.classList.toggle("is-done", done);
      btn.textContent = done ? "Completed ✓" : "Mark lesson complete";
    }
    paint();
    btn.addEventListener("click", function () {
      if (progress[btn.dataset.key]) delete progress[btn.dataset.key];
      else progress[btn.dataset.key] = 1;
      save(progress);
      paint();
    });
  });

  document.querySelectorAll(".lesson-list a[data-key]").forEach(function (a) {
    if (progress[a.dataset.key]) a.classList.add("is-done");
  });

  var total = 0;
  document.querySelectorAll(".card[data-module]").forEach(function (card) {
    var slug = card.dataset.module;
    var n = Object.keys(progress).filter(function (k) { return k.indexOf(slug + "/") === 0; }).length;
    total += n;
    var bar = card.querySelector(".progress i");
    if (bar) bar.style.width = Math.min(100, (n / Number(card.dataset.count)) * 100) + "%";
  });
  var overall = document.getElementById("overall");
  if (overall) overall.textContent = total;
})();
