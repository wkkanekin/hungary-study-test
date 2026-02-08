document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------
  // Elements
  // ----------------------------
  const keywordInput = document.getElementById("keyword");
  const regionFilter = document.getElementById("regionFilter");
  const courseFilter = document.getElementById("courseFilter");
  const applySearchBtn = document.getElementById("applySearch");
  const clearSearchBtn = document.getElementById("clearSearch");
  const showAllStudentsBtn = document.getElementById("showAllStudents");
  const suggestBox = document.getElementById("suggestBox");

  const studentListEl = document.getElementById("studentList");
  const noResultsEl = document.getElementById("noResults");
  const hitCountEl = document.getElementById("hitCount");

  // Contact
  const contactEmailLink = document.getElementById("contactEmailLink");
  const contactEmailText = document.getElementById("contactEmailText");

  // SNS
  const snsGridEl = document.getElementById("snsGrid");

  // ----------------------------
  // Data stores
  // ----------------------------
  let students = [];
  let suggestPool = [];

  // ----------------------------
  // Helpers
  // ----------------------------
  function esc(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function norm(str) {
    return String(str ?? "").trim().toLowerCase();
  }

  function setHitLabel(text) {
    if (!hitCountEl) return;
    hitCountEl.textContent = text || "";
  }

  function showNoResults(show) {
    if (!noResultsEl) return;
    noResultsEl.style.display = show ? "block" : "none";
  }

  function isPlaceholderUrl(url) {
    const u = String(url ?? "").trim();
    return !u || u === "#" || u.toLowerCase() === "todo" || u.toLowerCase() === "tbd";
  }

  function isLinkEnabled(linkObj) {
    // enabled が明示的に false なら準備中
    if (linkObj && linkObj.enabled === false) return false;
    // enabledがtrue/未指定でも URLが#や空なら準備中
    const url = String(linkObj?.url ?? "").trim();
    if (isPlaceholderUrl(url)) return false;
    return true;
  }

  function buildSearchText(stu) {
    const tags = Array.isArray(stu.tags) ? stu.tags.join(" ") : "";
    const links = Array.isArray(stu.links)
      ? stu.links.map((l) => `${l.label} ${l.url}`).join(" ")
      : "";
    const stip = stu?.stipendium?.has ? stu?.stipendium?.name || "stipendium" : "";
    return norm(
      [
        stu.name,
        stu.region,
        stu.course,
        stu.university,
        stu.major,
        stu.year,
        stu.language,
        stu.meeting,
        tags,
        links,
        stu.bio,
        stip,
      ].join(" ")
    );
  }

  function getFeaturedStudents(max = 999) {
    const enabled = students.filter((s) => !!s.enabled);
    const featured = enabled.filter((s) => !!s.featured);
    return (featured.length ? featured : enabled).slice(0, max);
  }

  // ----------------------------
  // Render Students (FULL)
  // ----------------------------
  function renderStudents(list, labelText = "") {
    if (!studentListEl) return;
    studentListEl.innerHTML = "";

    if (!list.length) {
      showNoResults(true);
      setHitLabel(labelText || "");
      return;
    }
    showNoResults(false);
    setHitLabel(labelText || "");

    list.forEach((stu) => {
      const stipBadge =
        stu?.stipendium?.has
          ? `<span class="badgeMini">奨学金：${esc(stu?.stipendium?.name || "取得")}</span>`
          : "";

      const tagsHtml = (stu.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

      const linksHtml = (stu.links || [])
        .filter((l) => l && l.label)
        .map((l) => {
          const label = String(l.label || "").trim() || "リンク";
          const enabled = isLinkEnabled(l);

          if (!enabled) {
            return `<span class="linkPill disabled" aria-disabled="true">${esc(label)}（準備中）</span>`;
          }
          return `<a class="linkPill" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
        })
        .join("");

      const bookingEnabled = !isPlaceholderUrl(stu.bookingUrl);
      const bookingBtn = bookingEnabled
        ? `<a class="btn primary" href="${esc(stu.bookingUrl)}" target="_blank" rel="noopener">空き枠を見る（6,000円 / 40分）</a>`
        : `<a class="btn" href="#" aria-disabled="true" onclick="return false;">空き枠を見る（準備中）</a>`;

      const card = document.createElement("article");
      card.className = `studentCard${stu.enabled ? "" : " disabled"}`;

      card.innerHTML = `
        <div class="studentTop">
          <div class="avatar" aria-label="アバター">
            <img src="${esc(stu.avatar)}" alt="${esc(stu.name)} のアバター" />
          </div>
          <div>
            <p class="studentName">${esc(stu.name)}</p>
            ${stu.featured ? `<span class="badgeMini">おすすめ</span>` : ``}
          </div>
        </div>

        ${stipBadge ? `<div>${stipBadge}</div>` : ""}

        <div class="metaBox" aria-label="プロフィール情報">
          <div class="metaRow"><span class="metaK">大学：</span><span class="metaV">${esc(stu.university)}</span></div>
          <div class="metaRow"><span class="metaK">地域：</span><span class="metaV">${esc(stu.region)}</span></div>
          <div class="metaRow"><span class="metaK">分野：</span><span class="metaV">${esc(stu.course)}</span></div>
          <div class="metaRow"><span class="metaK">専攻：</span><span class="metaV">${esc(stu.major)}</span></div>
          <div class="metaRow"><span class="metaK">学年：</span><span class="metaV">${esc(stu.year)}</span></div>
          <div class="metaRow"><span class="metaK">語学：</span><span class="metaV">${esc(stu.language)}</span></div>
          <div class="metaRow"><span class="metaK">面談：</span><span class="metaV">${esc(stu.meeting)}</span></div>
        </div>

        <p class="bio">${esc(stu.bio)}</p>

        ${tagsHtml ? `<div class="tags">${tagsHtml}</div>` : ""}

        ${linksHtml ? `<div class="linkList" aria-label="外部リンク">${linksHtml}</div>` : ""}

        ${bookingBtn}
      `;

      studentListEl.appendChild(card);
    });
  }

  // ----------------------------
  // Suggest (軽い実装：候補があるHTML前提)
  // ----------------------------
  function openSuggest() {
    if (!suggestBox) return;
    suggestBox.classList.add("open");
  }

  function closeSuggest() {
    if (!suggestBox) return;
    suggestBox.classList.remove("open");
    suggestBox.innerHTML = "";
  }

  function buildSuggestPool(studentsArr) {
    const set = new Set();
    studentsArr.forEach((s) => {
      if (s.university) set.add(String(s.university));
      if (s.region) set.add(String(s.region));
      if (s.course) set.add(String(s.course));
      if (Array.isArray(s.tags)) s.tags.forEach((t) => set.add(String(t)));
      if (Array.isArray(s.links)) s.links.forEach((l) => l?.label && set.add(String(l.label)));
    });
    return Array.from(set);
  }

  function renderSuggest(query) {
    if (!suggestBox) return;
    const q = norm(query);
    if (!q) {
      closeSuggest();
      return;
    }

    const hits = suggestPool
      .map((s) => ({ raw: s, n: norm(s) }))
      .filter((x) => x.n.includes(q))
      .slice(0, 8);

    if (!hits.length) {
      closeSuggest();
      return;
    }

    suggestBox.innerHTML = "";
    hits.forEach((h) => {
      const item = document.createElement("div");
      item.className = "suggestItem";
      item.innerHTML = `${esc(h.raw)}<span class="suggestMeta">クリックで入力</span>`;
      item.addEventListener("click", () => {
        if (keywordInput) keywordInput.value = h.raw;
        closeSuggest();
        keywordInput?.focus();
      });
      suggestBox.appendChild(item);
    });

    openSuggest();
  }

  document.addEventListener("click", (e) => {
    const t = e.target;
    if (!t) return;
    const inside = (suggestBox && suggestBox.contains(t)) || (keywordInput && keywordInput.contains(t));
    if (!inside) closeSuggest();
  });

  if (keywordInput) {
    keywordInput.addEventListener("input", () => renderSuggest(keywordInput.value));
    keywordInput.addEventListener("focus", () => renderSuggest(keywordInput.value));
  }

  // ----------------------------
  // Search
  // ----------------------------
  function applySearch() {
    const kw = norm(keywordInput?.value);
    const region = regionFilter?.value || "";
    const course = courseFilter?.value || "";

    // enabled の学生だけ対象
    const base = students.filter((s) => !!s.enabled);

    // 条件が全部空なら「おすすめ」だけ
    if (!kw && !region && !course) {
      const featured = getFeaturedStudents();
      renderStudents(featured, `おすすめ：${featured.length}名`);
      document.getElementById("students")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    const result = base.filter((stu) => {
      const text = buildSearchText(stu);
      const okKw = !kw || text.includes(kw);
      const okRegion = !region || String(stu.region) === region;
      const okCourse = !course || String(stu.course) === course;
      return okKw && okRegion && okCourse;
    });

    renderStudents(result, `検索結果：${result.length}名`);
    document.getElementById("students")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearSearch() {
    if (keywordInput) keywordInput.value = "";
    if (regionFilter) regionFilter.value = "";
    if (courseFilter) courseFilter.value = "";
    closeSuggest();

    const featured = getFeaturedStudents();
    renderStudents(featured, `おすすめ：${featured.length}名`);
  }

  function showAllStudents() {
    const all = students.filter((s) => !!s.enabled);
    renderStudents(all, `全学生：${all.length}名`);
    document.getElementById("students")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  if (applySearchBtn) applySearchBtn.addEventListener("click", applySearch);
  if (clearSearchBtn) clearSearchBtn.addEventListener("click", clearSearch);
  if (showAllStudentsBtn) showAllStudentsBtn.addEventListener("click", showAllStudents);

  // ----------------------------
  // Config: Contact & SNS (準備中ON/OFF)
  // ----------------------------
  function renderContact(cfg) {
    if (!contactEmailLink || !contactEmailText) return;
    const email = String(cfg?.email || "").trim();
    contactEmailText.textContent = email || "設定中";
    contactEmailLink.href = email ? `mailto:${encodeURIComponent(email)}` : "#";
  }

  function iconSvgForLabel(label) {
    const l = norm(label);

    if (l.includes("youtube")) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5A3 3 0 0 0 2.4 7.2 31.6 31.6 0 0 0 2 12a31.6 31.6 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 22 12a31.6 31.6 0 0 0-.4-4.8zM10 15.5v-7l6 3.5-6 3.5z"/></svg>`;
    }

    if (l.includes("instagram")) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm10 2H7a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3z"/><path d="M12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"/><path d="M17.5 6.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0z"/></svg>`;
    }

    if (l.includes("facebook")) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 8.5V7.3c0-.8.5-1 1-1h2V3h-3c-2.5 0-4 1.6-4 4v1.5H8v3h2v9h4v-9h3l.5-3H14z"/></svg>`;
    }

    if (l === "x" || l.includes("twitter")) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18.9 2H22l-6.8 7.8L23 22h-6.7l-5.2-6.7L5.3 22H2l7.3-8.4L1 2h6.9l4.7 6.1L18.9 2zm-1.2 18h1.8L6.2 4H4.3l13.4 16z"/></svg>`;
    }

    if (l.includes("note")) {
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h3.2l5.6 10.4V4H18v16h-3.2L9.2 9.6V20H6V4z"/></svg>`;
    }

    return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10.6 13.4a1 1 0 0 1 0-1.4l3.6-3.6a3 3 0 0 1 4.2 4.2l-1.6 1.6a1 1 0 1 1-1.4-1.4l1.6-1.6a1 1 0 1 0-1.4-1.4l-3.6 3.6a1 1 0 0 1-1.4 0z"/><path d="M13.4 10.6a1 1 0 0 1 0 1.4l-3.6 3.6a3 3 0 0 1-4.2-4.2l1.6-1.6a1 1 0 1 1 1.4 1.4l-1.6 1.6a1 1 0 1 0 1.4 1.4l3.6-3.6a1 1 0 0 1 1.4 0z"/></svg>`;
  }

  function renderSNS(cfg) {
    if (!snsGridEl) return;
    snsGridEl.innerHTML = "";

    const socials = Array.isArray(cfg?.socials) ? cfg.socials : [];

    socials.forEach((s) => {
      const enabled = s?.enabled !== false && !isPlaceholderUrl(s?.url);

      if (enabled) {
        const a = document.createElement("a");
        a.className = "snsItem";
        a.href = s.url;
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = `
          <div class="snsIcon">${iconSvgForLabel(s.label)}</div>
          <div class="snsLabel">${esc(s.label || "SNS")}</div>
        `;
        snsGridEl.appendChild(a);
      } else {
        // 準備中：表示はするがクリック不可
        const div = document.createElement("div");
        div.className = "snsItem";
        div.setAttribute("aria-disabled", "true");
        div.style.opacity = "0.72";
        div.innerHTML = `
          <div class="snsIcon">${iconSvgForLabel(s.label)}</div>
          <div class="snsLabel">${esc(s.label || "SNS")}（準備中）</div>
        `;
        snsGridEl.appendChild(div);
      }
    });
  }

  // ----------------------------
  // Load JSON
  // ----------------------------
  async function loadStudents() {
    const res = await fetch("students.json", { cache: "no-store" });
    if (!res.ok) throw new Error("students.json が読み込めません: " + res.status);

    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("students.json の形式が不正です（配列にしてください）");

    students = data;
    suggestPool = buildSuggestPool(students.filter((s) => !!s.enabled));

    const featured = getFeaturedStudents();
    renderStudents(featured, `おすすめ：${featured.length}名`);
  }

  async function loadConfig() {
    const res = await fetch("config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("config.json が読み込めません: " + res.status);

    const cfg = await res.json();
    renderContact(cfg);
    renderSNS(cfg);
  }

  (async () => {
    try {
      await Promise.all([loadStudents(), loadConfig()]);
    } catch (e) {
      console.error(e);
      // ここでのUIは最小限（壊さない）
      if (studentListEl) {
        studentListEl.innerHTML = `<div class="card" style="padding:16px">
          <div style="font-weight:950;color:#0f2a5a">読み込みに失敗しました</div>
          <div class="muted" style="font-weight:850; margin-top:6px">students.json / config.json のJSON形式、ファイル名、配置を確認してください。</div>
        </div>`;
      }
    }
  })();
});
