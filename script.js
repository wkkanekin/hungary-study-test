(() => {
  /* =========================
     Utility
  ========================= */
  const $ = (id) => document.getElementById(id);
  const escapeHTML = (s = "") =>
    s.replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );

  /* =========================
     State
  ========================= */
  let students = [];
  let filtered = [];

  /* =========================
     Elements
  ========================= */
  const keywordInput = $("keyword");
  const regionFilter = $("regionFilter");
  const courseFilter = $("courseFilter");
  const applySearchBtn = $("applySearch");
  const clearSearchBtn = $("clearSearch");
  const showAllStudentsBtn = $("showAllStudents");
  const studentListEl = $("studentList");
  const noResultsEl = $("noResults");
  const hitCountEl = $("hitCount");

  // Contact
  const contactEmailLink = $("contactEmailLink");
  const contactEmailText = $("contactEmailText");

  // SNS
  const snsGridEl = $("snsGrid");

  /* =========================
     Load JSON
  ========================= */
  Promise.all([
    fetch("students.json").then((r) => r.json()),
    fetch("config.json").then((r) => r.json()),
  ])
    .then(([studentsData, config]) => {
      students = Array.isArray(studentsData) ? studentsData : [];
      filtered = students.filter((s) => s.enabled);

      renderStudents(filtered, true);
      renderSNS(config);
      renderContact(config);
      bindSearch();
    })
    .catch((e) => {
      console.error("JSON load error:", e);
    });

  /* =========================
     Render: Students
  ========================= */
  function renderStudents(list, initial = false) {
    studentListEl.innerHTML = "";
    noResultsEl.style.display = list.length ? "none" : "block";
    hitCountEl.textContent = list.length ? `${list.length}名表示中` : "";

    // 初期は「おすすめ（featured）」のみ
    const showList =
      initial && !keywordInput.value && !regionFilter.value && !courseFilter.value
        ? list.filter((s) => s.featured)
        : list;

    showList.forEach((s) => {
      const card = document.createElement("article");
      card.className = "studentCard" + (s.enabled ? "" : " disabled");

      card.innerHTML = `
        <div class="studentTop">
          <div class="avatar"><img src="${escapeHTML(s.avatar)}" alt="${escapeHTML(
        s.name
      )}"></div>
          <div>
            <p class="studentName">${escapeHTML(s.name)}</p>
            ${s.featured ? `<span class="badgeMini">おすすめ</span>` : ``}
          </div>
        </div>

        <div class="metaBox">
          <div class="metaRow"><span class="metaK">大学</span><span class="metaV">${escapeHTML(
            s.university
          )}</span></div>
          <div class="metaRow"><span class="metaK">専攻</span><span class="metaV">${escapeHTML(
            s.major
          )}</span></div>
          <div class="metaRow"><span class="metaK">地域</span><span class="metaV">${escapeHTML(
            s.region
          )}</span></div>
          <div class="metaRow"><span class="metaK">学年</span><span class="metaV">${escapeHTML(
            s.year
          )}</span></div>
          <div class="metaRow"><span class="metaK">言語</span><span class="metaV">${escapeHTML(
            s.language
          )}</span></div>
        </div>

        <p class="bio">${escapeHTML(s.bio)}</p>

        <div class="tags">
          ${(s.tags || []).map((t) => `<span class="tag">${escapeHTML(t)}</span>`).join("")}
        </div>

        <div class="linkList">
          ${renderLinks(s.links || [])}
        </div>

        <div class="centerActions" style="margin-top:8px;">
          ${
            s.bookingUrl && s.bookingUrl !== "#"
              ? `<a class="btn primary" href="${escapeHTML(
                  s.bookingUrl
                )}" target="_blank" rel="noopener">空き枠を見る</a>`
              : `<button class="btn" disabled>予約準備中</button>`
          }
        </div>
      `;
      studentListEl.appendChild(card);
    });
  }

  /* =========================
     Render: Links (準備中対応)
  ========================= */
  function renderLinks(links) {
    return links
      .map((l) => {
        const isEnabled = l.enabled !== false && l.url && l.url !== "#";
        if (!isEnabled) {
          return `<span class="linkPill disabled">${escapeHTML(l.label)}（準備中）</span>`;
        }
        return `<a class="linkPill" href="${escapeHTML(
          l.url
        )}" target="_blank" rel="noopener">${escapeHTML(l.label)}</a>`;
      })
      .join("");
  }

  /* =========================
     Search
  ========================= */
  function bindSearch() {
    applySearchBtn.addEventListener("click", applySearch);
    clearSearchBtn.addEventListener("click", () => {
      keywordInput.value = "";
      regionFilter.value = "";
      courseFilter.value = "";
      renderStudents(students.filter((s) => s.enabled), true);
    });
    showAllStudentsBtn.addEventListener("click", () => {
      renderStudents(students.filter((s) => s.enabled), false);
    });
  }

  function applySearch() {
    const kw = keywordInput.value.trim().toLowerCase();
    const region = regionFilter.value;
    const course = courseFilter.value;

    const result = students.filter((s) => {
      if (!s.enabled) return false;
      if (region && s.region !== region) return false;
      if (course && s.course !== course) return false;
      if (!kw) return true;

      return (
        s.name.toLowerCase().includes(kw) ||
        s.university.toLowerCase().includes(kw) ||
        s.major.toLowerCase().includes(kw) ||
        (s.tags || []).join(" ").toLowerCase().includes(kw)
      );
    });

    renderStudents(result, false);
  }

  /* =========================
     Render: SNS (準備中対応)
  ========================= */
  function renderSNS(config) {
    if (!config || !Array.isArray(config.socials)) return;
    snsGridEl.innerHTML = "";

    config.socials.forEach((s) => {
      const isEnabled = s.enabled !== false && s.url && s.url !== "#";
      const item = document.createElement(isEnabled ? "a" : "div");
      item.className = "snsItem" + (isEnabled ? "" : " disabled");
      if (isEnabled) {
        item.href = s.url;
        item.target = "_blank";
        item.rel = "noopener";
      }

      item.innerHTML = `
        <div class="snsIcon">${escapeHTML(s.label[0])}</div>
        <div class="snsLabel">${escapeHTML(s.label)}${isEnabled ? "" : "（準備中）"}</div>
      `;
      snsGridEl.appendChild(item);
    });
  }

  /* =========================
     Contact
  ========================= */
  function renderContact(config) {
    if (!config || !config.email) return;
    contactEmailText.textContent = config.email;
    contactEmailLink.href = `mailto:${config.email}`;
  }
})();
