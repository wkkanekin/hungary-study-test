document.addEventListener("DOMContentLoaded", () => {
  // ----------------------------
  // Recruit: 「申し込みフォームへ」ボタンでアコーディオンを開閉（2重情報を避ける）
  // ----------------------------
  const openRecruitFormBtn = document.getElementById("openRecruitForm");
  const recruitAccordionEl = document.getElementById("recruitAccordion");

  if (openRecruitFormBtn && recruitAccordionEl) {
    openRecruitFormBtn.setAttribute("aria-expanded", String(!!recruitAccordionEl.open));

    openRecruitFormBtn.addEventListener("click", () => {
      const willOpen = !recruitAccordionEl.open;
      recruitAccordionEl.open = willOpen;

      openRecruitFormBtn.textContent = willOpen ? "フォームを閉じる" : "申し込みフォームへ";
      openRecruitFormBtn.setAttribute("aria-expanded", String(willOpen));

      if (willOpen) {
        recruitAccordionEl.scrollIntoView({ behavior: "smooth", block: "start" });
        document.getElementById("rf_name")?.focus();
      }
    });
  }

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

  // Recruit form
  const recruitForm = document.getElementById("recruitForm");
  const rfName = document.getElementById("rf_name");
  const rfUni = document.getElementById("rf_uni");
  const rfYear = document.getElementById("rf_year");
  const rfEmail = document.getElementById("rf_email");
  const rfNote = document.getElementById("rf_note");

  // Map
  const mapEl = document.getElementById("huMap");
  const uniListEl = document.getElementById("uniList");
  const mapHintEl = document.getElementById("mapHint");
  const mapStatusEl = document.getElementById("mapStatus");
  const mapCountsEl = document.getElementById("mapCounts");
  const clearUniBtn = document.getElementById("clearUniFilter");
  const applyMapSearchBtn = document.getElementById("applyMapSearch");
  const pickedUniEl = document.getElementById("pickedUni");

  // Images (Hero / Basics / SNS icons)
  const heroLogoImg = document.getElementById("heroLogo");
  const basicImgHungary = document.getElementById("basicImg_hungary");
  const basicImgUniversity = document.getElementById("basicImg_university");
  const basicImgScholarship = document.getElementById("basicImg_scholarship");

  // ----------------------------
  // Data stores
  // ----------------------------
  let students = [];
  let suggestPool = [];
  let pickedUniversityName = "";

  let imagesCfg = null;
  let snsIconStore = {}; // label -> {type, svg, url}

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

  function scrollToStudents() {
    document.getElementById("students")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function setHitLabel(text) {
    if (!hitCountEl) return;
    hitCountEl.textContent = text || "";
  }

  function showNoResults(show) {
    if (!noResultsEl) return;
    noResultsEl.style.display = show ? "block" : "none";
  }

  function isEnabled(stu) {
    return !!stu.enabled;
  }

  // 初期表示を短くするため「おすすめ」を最大2件だけ出す
  function getFeaturedStudents(max = 2) {
    const featured = students.filter((s) => !!s.enabled && !!s.featured);
    if (featured.length) return featured.slice(0, max);
    return students.filter((s) => !!s.enabled).slice(0, max);
  }

  function hasAnySearchCondition() {
    const kw = norm(keywordInput?.value);
    const region = regionFilter?.value || "";
    const course = courseFilter?.value || "";
    return !!(kw || region || course || pickedUniversityName);
  }

  function buildSearchText(stu) {
    const tags = Array.isArray(stu.tags) ? stu.tags.join(" ") : "";
    const links = Array.isArray(stu.links) ? stu.links.map((l) => `${l.label} ${l.url}`).join(" ") : "";
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

  function isLinkReady(linkObj) {
    if (typeof linkObj?.ready === "boolean") return linkObj.ready;
    return true;
  }

  function renderStudents(list) {
    if (!studentListEl) return;
    studentListEl.innerHTML = "";

    if (!list.length) {
      showNoResults(true);
      return;
    }
    showNoResults(false);

    list.forEach((stu) => {
      const disabled = !isEnabled(stu);

      const stipBadge = stu?.stipendium?.has
        ? `<span class="badgeMini">奨学金：${esc(stu?.stipendium?.name || "取得")}</span>`
        : "";

      const tagsHtml = (stu.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join("");

      const linksHtml = (stu.links || [])
        .filter((l) => l && l.label)
        .map((l) => {
          const label = String(l.label || "");
          const ready = isLinkReady(l);
          const url = String(l.url || "#");

          if (!ready) {
            return `<span class="linkPill disabled" aria-disabled="true">${esc(label)}（準備中）</span>`;
          }
          if (!l.url) {
            return `<span class="linkPill disabled" aria-disabled="true">${esc(label)}（設定中）</span>`;
          }
          return `<a class="linkPill" href="${esc(url)}" target="_blank" rel="noopener">${esc(label)}</a>`;
        })
        .join("");

      const bookingBtn = disabled
        ? `<a class="btn" href="#" aria-disabled="true" onclick="return false;">空き枠を見る（準備中）</a>`
        : `<a class="btn primary" href="${esc(stu.bookingUrl)}" target="_blank" rel="noopener">空き枠を見る（6,000円 / 40分）</a>`;

      const card = document.createElement("article");
      card.className = `studentCard${disabled ? " disabled" : ""}`;

      card.innerHTML = `
        <div class="studentTop">
          <div class="avatar" aria-label="アバター">
            <img src="${esc(stu.avatar)}" alt="${esc(stu.name)} のアバター" />
          </div>
          <div>
            <p class="studentName">${esc(stu.name)}</p>
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
  // Students list controls
  // ----------------------------
  function applyFilterAndJump() {
    if (!hasAnySearchCondition()) {
      const featured = getFeaturedStudents(2);
      renderStudents(featured);
      setHitLabel(`おすすめ：${featured.length}名`);
      scrollToStudents();
      return;
    }

    const kw = norm(keywordInput?.value);
    const region = regionFilter?.value || "";
    const course = courseFilter?.value || "";

    const filtered = students.filter((stu) => {
      const text = buildSearchText(stu);

      const okKw = !kw || text.includes(kw);
      const okRegion = !region || String(stu.region) === region;
      const okCourse = !course || String(stu.course) === course;

      return okKw && okRegion && okCourse;
    });

    renderStudents(filtered);
    setHitLabel(`検索結果：${filtered.length}名`);
    scrollToStudents();
  }

  function clearSearch() {
    if (keywordInput) keywordInput.value = "";
    if (regionFilter) regionFilter.value = "";
    if (courseFilter) courseFilter.value = "";

    pickedUniversityName = "";
    if (pickedUniEl) pickedUniEl.textContent = "未選択";

    closeSuggest();

    const featured = getFeaturedStudents(2);
    renderStudents(featured);
    setHitLabel(`おすすめ：${featured.length}名`);
  }

  function showAllStudents() {
    renderStudents(students);
    setHitLabel(`全学生：${students.length}名`);
    scrollToStudents();
  }

  // ----------------------------
  // Suggest (dropdown)
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

    ["奨学金", "Stipendium", "スティペンディウム", "出願", "生活費", "住まい", "治安"].forEach((w) => set.add(w));

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
  // Load JSON
  // ----------------------------
  async function loadStudents() {
    const res = await fetch("students.json", { cache: "no-store" });
    if (!res.ok) throw new Error("students.json が読み込めません: " + res.status);
    const data = await res.json();
    if (!Array.isArray(data)) throw new Error("students.json の形式が不正です（配列にしてください）");

    students = data;
    suggestPool = buildSuggestPool(students);

    const featured = getFeaturedStudents(2);
    renderStudents(featured);
    setHitLabel(`おすすめ：${featured.length}名`);
  }

  // ✅ images.json が無くても全体が止まらないようにする
  async function tryLoadImagesAny() {
    const candidates = [
      "images.json",
      "Images.json",
      "IMAGES.json",
      "imiges.json",
      "imiges.Json",
      "Imiges.json",
      "imiges.JSON",
    ];

    for (const filename of candidates) {
      try {
        const res = await fetch(filename, { cache: "no-store" });
        if (!res.ok) continue;
        const cfg = await res.json();
        return cfg;
      } catch (e) {
        // 次候補へ
      }
    }
    return null;
  }

  async function loadImagesOptional() {
    const cfg = await tryLoadImagesAny();
    if (!cfg) {
      console.warn("images.json（または代替名）が見つかりません。画像はデフォルトで動作します。");
      imagesCfg = null;
      snsIconStore = {};
      return;
    }

    imagesCfg = cfg;

    const snsIcons = cfg?.snsIcons && typeof cfg.snsIcons === "object" ? cfg.snsIcons : {};
    snsIconStore = snsIcons || {};

    applyImages(cfg);
  }

  function applyImages(cfg) {
    if (!cfg || typeof cfg !== "object") return;

    // Hero bg
    const heroUrl = String(cfg?.hero?.imageUrl || "").trim();
    if (heroUrl) {
      document.documentElement.style.setProperty("--hero-image", `url("${heroUrl}")`);
    }

    // Hero logo
    const logoUrl = String(cfg?.hero?.logoUrl || "").trim();
    const logoAlt = String(cfg?.hero?.logoAlt || "HU").trim();
    if (heroLogoImg) {
      if (logoUrl) heroLogoImg.src = logoUrl;
      heroLogoImg.alt = logoAlt || "HU";
    }

    // Basics cards images
    const cards = Array.isArray(cfg?.basicsCards) ? cfg.basicsCards : [];
    const map = new Map();
    cards.forEach((c) => {
      const id = String(c?.id || "").trim();
      if (!id) return;
      map.set(id, c);
    });

    const cHungary = map.get("hungary");
    if (basicImgHungary && cHungary?.imageUrl) {
      basicImgHungary.src = String(cHungary.imageUrl);
      basicImgHungary.alt = String(cHungary.alt || basicImgHungary.alt || "ハンガリーについて");
    }

    const cUniversity = map.get("university");
    if (basicImgUniversity && cUniversity?.imageUrl) {
      basicImgUniversity.src = String(cUniversity.imageUrl);
      basicImgUniversity.alt = String(cUniversity.alt || basicImgUniversity.alt || "大学の探し方");
    }

    const cScholarship = map.get("scholarship");
    if (basicImgScholarship && cScholarship?.imageUrl) {
      basicImgScholarship.src = String(cScholarship.imageUrl);
      basicImgScholarship.alt = String(
        cScholarship.alt || basicImgScholarship.alt || "奨学金（スティペンディウム・ハンガリカム）"
      );
    }
  }

  async function loadConfig() {
    const res = await fetch("config.json", { cache: "no-store" });
    if (!res.ok) throw new Error("config.json が読み込めません: " + res.status);
    const cfg = await res.json();

    if (contactEmailLink && contactEmailText) {
      const email = String(cfg.email || "").trim();
      contactEmailLink.href = email ? `mailto:${encodeURIComponent(email)}` : "#";
      contactEmailText.textContent = email || "設定中";
    }

    if (snsGridEl) {
      snsGridEl.innerHTML = "";
      const socials = Array.isArray(cfg.socials) ? cfg.socials : [];

      socials.forEach((s) => {
        const a = document.createElement("a");
        a.className = "snsItem";
        a.href = s.url || "#";
        a.target = "_blank";
        a.rel = "noopener";
        a.innerHTML = `
          <div class="snsIcon">${iconForLabel(s.label)}</div>
          <div class="snsLabel">${esc(s.label || "SNS")}</div>
        `;
        snsGridEl.appendChild(a);
      });
    }

    if (recruitForm) {
      recruitForm.dataset.mailto = String(cfg.email || "").trim();
    }
  }

  function iconForLabel(label) {
    const rawLabel = String(label || "").trim();
    const keyExact = rawLabel;
    const keyLower = norm(rawLabel);

    const iconExact = snsIconStore?.[keyExact];
    if (iconExact) return iconFromStore(iconExact);

    if (snsIconStore && typeof snsIconStore === "object") {
      for (const k of Object.keys(snsIconStore)) {
        if (norm(k) === keyLower) {
          return iconFromStore(snsIconStore[k]);
        }
      }
    }

    // fallback
    const l = keyLower;

    if (l.includes("youtube")) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.8 4.6 12 4.6 12 4.6s-5.8 0-7.5.5A3 3 0 0 0 2.4 7.2 31.6 31.6 0 0 0 2 12a31.6 31.6 0 0 0 .4 4.8 3 3 0 0 0 2.1 2.1c1.7.5 7.5.5 7.5.5s5.8 0 7.5-.5a3 3 0 0 0 2.1-2.1A31.6 31.6 0 0 0 22 12a31.6 31.6 0 0 0-.4-4.8z"/>
          <path d="M10 15.5V8.5L16 12l-6 3.5z" fill="white"/>
        </svg>
      `;
    }

    if (l.includes("instagram")) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5z"/>
          <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" fill="white"/>
          <circle cx="17.5" cy="6.5" r="1.2" fill="white"/>
        </svg>
      `;
    }

    if (l.includes("facebook")) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M13.5 22v-8h2.7l.4-3h-3.1V9.1c0-.9.3-1.5 1.6-1.5h1.7V4.9c-.3 0-1.4-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6V11H7.1v3h2.5v8h3.9z"/>
        </svg>
      `;
    }

    if (l === "x" || l.includes("twitter")) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.9 2H22l-6.8 7.8L23 22h-6.4l-5-6.6L5.7 22H2l7.4-8.5L1 2h6.6l4.5 5.9L18.9 2z"/>
        </svg>
      `;
    }

    if (l.includes("note")) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 3h9l3 3v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z"/>
          <path d="M15 3v4a1 1 0 0 0 1 1h4" fill="white"/>
          <path d="M7.5 11h9M7.5 14h9M7.5 17h6.5" stroke="white" stroke-width="1.6" stroke-linecap="round" fill="none"/>
        </svg>
      `;
    }

    return `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M10.6 13.4a1 1 0 0 0 1.4 0l3.6-3.6a3 3 0 1 0-4.2-4.2l-1.8 1.8 1.4 1.4 1.8-1.8a1 1 0 0 1 1.4 1.4l-3.6 3.6a1 1 0 0 1-1.4 0 1 1 0 0 1 0-1.4l.6-.6-1.4-1.4-.6.6a3 3 0 1 0 4.2 4.2z"/>
        <path d="M13.4 10.6a1 1 0 0 0-1.4 0l-3.6 3.6a3 3 0 1 0 4.2 4.2l1.8-1.8-1.4-1.4-1.8 1.8a1 1 0 0 1-1.4-1.4l3.6-3.6a1 1 0 0 1 1.4 0 1 1 0 0 1 0 1.4l-.6.6 1.4 1.4.6-.6a3 3 0 1 0-4.2-4.2z"/>
      </svg>
    `;
  }

  function iconFromStore(iconObj) {
    const type = String(iconObj?.type || "").trim().toLowerCase();

    if (type === "svg") {
      const svg = String(iconObj?.svg || "").trim();
      return svg || "";
    }

    if (type === "img") {
      const url = String(iconObj?.url || "").trim();
      const alt = String(iconObj?.alt || "").trim() || "icon";
      if (!url) return "";
      return `<img src="${esc(url)}" alt="${esc(alt)}" style="width:18px;height:18px;display:block;object-fit:contain;" />`;
    }

    const svgFallback = String(iconObj?.svg || "").trim();
    if (svgFallback) return svgFallback;

    return "";
  }

  // ----------------------------
  // Search Buttons
  // ----------------------------
  if (applySearchBtn) applySearchBtn.addEventListener("click", applyFilterAndJump);
  if (clearSearchBtn) clearSearchBtn.addEventListener("click", clearSearch);
  if (showAllStudentsBtn) showAllStudentsBtn.addEventListener("click", showAllStudents);

  // ----------------------------
  // Recruit mailto submit
  // ----------------------------
  function buildRecruitMailto() {
    const to = (recruitForm?.dataset?.mailto || "").trim();

    const name = rfName?.value?.trim() || "";
    const uni = rfUni?.value?.trim() || "";
    const year = rfYear?.value?.trim() || "";
    const email = rfEmail?.value?.trim() || "";
    const note = rfNote?.value?.trim() || "";

    const subject = `【現役生 申し込み】${name || "（名前未入力）"}`;
    const bodyLines = [
      "現役生の申し込み（LP）",
      "",
      `名前（表示名）：${name}`,
      `大学名：${uni}`,
      `学年・課程：${year}`,
      `メールアドレス：${email}`,
      "",
      "自由記述（任意）：",
      note || "（なし）",
      "",
      "※ まずは簡単な情報だけで大丈夫です。内容を確認後、こちらから詳しくご連絡いたします。",
    ];

    const body = bodyLines.join("\n");
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  if (recruitForm) {
    recruitForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const email = rfEmail?.value?.trim() || "";
      if (!email) {
        alert("メールアドレス（折り返し連絡用）を入力してください。");
        rfEmail?.focus();
        return;
      }

      window.location.href = buildRecruitMailto();
    });
  }

  // ----------------------------
  // Map (Leaflet)
  // ----------------------------
  const cityCoords = {
    "ブダペスト": { lat: 47.4979, lng: 19.0402 },
    "デブレツェン": { lat: 47.5316, lng: 21.6273 },
    "セゲド": { lat: 46.2530, lng: 20.1414 },
    "ペーチ": { lat: 46.0727, lng: 18.2323 },
    "ミシュコルツ": { lat: 48.1035, lng: 20.7784 },
    "ショプロン": { lat: 47.6817, lng: 16.5845 },
    "ジェール": { lat: 47.6875, lng: 17.6504 },
    "ヴェスプレーム": { lat: 47.0930, lng: 17.9110 },
    "ニーレジハーザ": { lat: 47.9554, lng: 21.7167 },
    "ドゥナウーイヴァーロシュ": { lat: 46.9619, lng: 18.9355 },
    "ケチケメート": { lat: 46.8964, lng: 19.6897 },
    "ギョドゥルー": { lat: 47.5966, lng: 19.3552 },
    "エゲル": { lat: 47.9025, lng: 20.3772 },
    "シャーロシュパタク": { lat: 48.3245, lng: 21.5686 },
    "ヴァーツ": { lat: 47.7785, lng: 19.1280 },
    "バヤ": { lat: 46.1803, lng: 18.9567 },
  };

  const universities = [
    { name: "Budapest University of Technology and Economics", city: "ブダペスト" },
    { name: "Corvinus University of Budapest", city: "ブダペスト" },
    { name: "Eötvös Loránd University", city: "ブダペスト" },
    { name: "Semmelweis University", city: "ブダペスト" },
    { name: "Hungarian University of Fine Arts", city: "ブダペスト" },
    { name: "Hungarian University of Sports Science", city: "ブダペスト" },
    { name: "Hungarian Dance University", city: "ブダペスト" },
    { name: "Liszt Ferenc Academy of Music", city: "ブダペスト" },
    { name: "Moholy-Nagy University of Art and Design", city: "ブダペスト" },
    { name: "Óbuda University", city: "ブダペスト" },
    { name: "Pázmány Péter Catholic University", city: "ブダペスト" },
    { name: "Károli Gáspár University of the Reformed Church in Hungary", city: "ブダペスト" },
    { name: "Ludovika University of Public Service", city: "ブダペスト" },
    { name: "John Wesley Theological College", city: "ブダペスト" },
    { name: "Dharma Gate Buddhist College", city: "ブダペスト" },
    { name: "Budapest Metropolitan University", city: "ブダペスト" },
    { name: "Budapest University of Economics and Business", city: "ブダペスト" },
    { name: "University of Veterinary Medicine Budapest", city: "ブダペスト" },
    { name: "MFA Balassi Preparatory Programme", city: "ブダペスト" },

    { name: "University of Debrecen", city: "デブレツェン" },
    { name: "University of Szeged", city: "セゲド" },
    { name: "University of Pécs", city: "ペーチ" },
    { name: "University of Miskolc", city: "ミシュコルツ" },
    { name: "University of Sopron", city: "ショプロン" },
    { name: "Széchenyi István University", city: "ジェール" },
    { name: "University of Pannonia", city: "ヴェスプレーム" },
    { name: "University of Nyíregyháza", city: "ニーレジハーザ" },
    { name: "University of Dunaújváros", city: "ドゥナウーイヴァーロシュ" },
    { name: "John von Neumann University", city: "ケチケメート" },
    { name: "Hungarian University of Agriculture and Life Sciences (MATE)", city: "ギョドゥルー" },
    { name: "Eszterházy Károly Catholic University", city: "エゲル" },
    { name: "University of Tokaj", city: "シャーロシュパタク" },

    { name: "Apor Vilmos Catholic College", city: "ヴァーツ" },
    { name: "Episcopal Theological College of Pécs", city: "ペーチ" },
    { name: "Eötvös József College", city: "バヤ" },
    { name: "Kodály Institute", city: "ケチケメート" },
  ];

  function groupByCity(items) {
    const map = new Map();
    items.forEach((u) => {
      if (!map.has(u.city)) map.set(u.city, []);
      map.get(u.city).push(u);
    });
    return map;
  }

  function setPickedUniversity(name) {
    pickedUniversityName = name || "";
    if (pickedUniEl) pickedUniEl.textContent = pickedUniversityName || "未選択";
  }

  function setClearUniEnabled(enable) {
    if (!clearUniBtn) return;
    clearUniBtn.disabled = !enable;
  }

  function renderUniversityList(city, list) {
    if (!uniListEl) return;
    if (mapHintEl) mapHintEl.style.display = "none";

    uniListEl.innerHTML = "";

    const group = document.createElement("div");
    group.className = "uniGroup";

    const head = document.createElement("div");
    head.className = "uniCity";
    head.textContent = `${city}（${list.length}校）`;
    group.appendChild(head);

    list.forEach((u) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "uniBtn";
      btn.textContent = u.name;

      btn.addEventListener("click", () => {
        setPickedUniversity(u.name);
        if (keywordInput) keywordInput.value = u.name;
        closeSuggest();
        applyFilterAndJump();
      });

      group.appendChild(btn);
    });

    uniListEl.appendChild(group);
    setClearUniEnabled(true);
  }

  function clearUniversityFilter() {
    setPickedUniversity("");
    if (uniListEl) uniListEl.innerHTML = "";
    if (mapHintEl) mapHintEl.style.display = "block";
    setClearUniEnabled(false);
  }

  if (clearUniBtn) {
    setClearUniEnabled(false);
    clearUniBtn.addEventListener("click", () => clearUniversityFilter());
  }

  if (applyMapSearchBtn) {
    applyMapSearchBtn.addEventListener("click", () => {
      if (pickedUniversityName && keywordInput) keywordInput.value = pickedUniversityName;
      closeSuggest();
      applyFilterAndJump();
    });
  }

  function initMap() {
    if (!mapEl) {
      console.warn("huMap 要素が見つかりません");
      return;
    }
    if (!window.L) {
      console.error("Leaflet(L) が読み込めていません。index.html の Leaflet script を確認してください。");
      if (mapStatusEl) mapStatusEl.textContent = "地図ライブラリの読み込みに失敗";
      return;
    }

    if (mapStatusEl) mapStatusEl.textContent = "準備中…";

    const huMap = L.map("huMap", { scrollWheelZoom: false });
    huMap.setView([47.1625, 19.5033], 7);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap contributors",
      maxZoom: 18,
    }).addTo(huMap);

    const byCity = groupByCity(universities);

    let cityCount = 0;
    byCity.forEach((list, city) => {
      const c = cityCoords[city];
      if (!c) return;

      const marker = L.circleMarker([c.lat, c.lng], {
        radius: 8,
        weight: 2,
        fillOpacity: 0.7,
      }).addTo(huMap);

      marker.bindTooltip(`${city}（${list.length}）`, { direction: "top" });

      marker.on("mouseover", () => marker.setStyle({ radius: 12, weight: 3, fillOpacity: 0.9 }));
      marker.on("mouseout", () => marker.setStyle({ radius: 8, weight: 2, fillOpacity: 0.7 }));

      marker.on("click", () => {
        renderUniversityList(city, list);
        document.getElementById("mapSearch")?.scrollIntoView({ behavior: "smooth", block: "start" });
      });

      cityCount++;
    });

    if (mapCountsEl) {
      mapCountsEl.style.display = "inline-flex";
      mapCountsEl.textContent = `都市：${cityCount} / 大学：${universities.length}`;
    }
    if (mapStatusEl) mapStatusEl.textContent = "都市をクリックすると大学一覧が表示されます";
  }

  // ----------------------------
  // Boot
  // ----------------------------
  (async () => {
    // ✅ ここが重要：images が死んでも students/map は動かす
    try {
      await loadImagesOptional();
    } catch (e) {
      console.warn("images.json 読み込みでエラー（無視して続行）:", e);
    }

    try {
      await loadStudents();
    } catch (e) {
      console.error(e);
      if (studentListEl) {
        studentListEl.innerHTML = `<div class="card" style="padding:16px">
          <div style="font-weight:950;color:#0f2a5a">現役生一覧の読み込みに失敗しました</div>
          <div class="muted" style="font-weight:850; margin-top:6px">students.json の配置・ファイル名を確認してください。</div>
        </div>`;
      }
    }

    try {
      await loadConfig();
    } catch (e) {
      console.error(e);
    }

    // ✅ 地図は必ず起動を試みる
    try {
      initMap();
    } catch (e) {
      console.error(e);
      if (mapStatusEl) mapStatusEl.textContent = "地図の初期化でエラー";
    }
  })();
});
