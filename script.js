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

  // SNS
  const snsGridEl = document.getElementById("snsGrid");

  // Contact (統合フォーム)
  const contactForm = document.getElementById("contactForm");
  const cfName = document.getElementById("cf_name");
  const cfEmail = document.getElementById("cf_email");
  const cfUniWrap = document.getElementById("cf_uni_wrap");
  const cfYearWrap = document.getElementById("cf_year_wrap");
  const cfUni = document.getElementById("cf_uni");
  const cfYear = document.getElementById("cf_year");
  const cfMessage = document.getElementById("cf_message");
  const contactNoteEl = document.getElementById("contactNote");

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

  // config
  let contactToEmail = ""; // config.json の email

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

      // ✅ note / YouTube などを ready:false で「準備中」表示にできる
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
  // JSON loading helpers
  // ----------------------------
  async function fetchText(url) {
    const u = new URL(url, location.href).toString();
    const res = await fetch(u, { cache: "no-store" });
    if (!res.ok) {
      const t = await res.text().catch(() => "");
      throw new Error(`${url} fetch失敗: ${res.status} ${res.statusText} / body=${t.slice(0, 120)}`);
    }
    return await res.text();
  }

  function stripBOM(s) {
    // UTF-8 BOM(\uFEFF) を除去
    if (!s) return s;
    return s.charCodeAt(0) === 0xfeff ? s.slice(1) : s;
  }

  function safeJsonParse(text, filenameForMsg) {
    const raw = stripBOM(String(text ?? ""));
    try {
      return JSON.parse(raw);
    } catch (e) {
      const head = raw.slice(0, 180).replaceAll("\n", "\\n");
      throw new Error(`${filenameForMsg} JSONパース失敗: ${e?.message || e} / 先頭=${head}`);
    }
  }

  // ----------------------------
  // Load JSON
  // ----------------------------
  async function loadStudents() {
    const txt = await fetchText("students.json");
    const data = safeJsonParse(txt, "students.json");
    if (!Array.isArray(data)) {
      throw new Error(`students.json の形式が不正です（配列にしてください）。type=${typeof data}`);
    }

    students = data;
    suggestPool = buildSuggestPool(students);

    const featured = getFeaturedStudents(2);
    renderStudents(featured);
    setHitLabel(`おすすめ：${featured.length}名`);
  }

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
        const txt = await fetchText(filename);
        const cfg = safeJsonParse(txt, filename);
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

    imagesCfg = cfg || null;

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
    const txt = await fetchText("config.json");
    const cfg = safeJsonParse(txt, "config.json");

    // email（contact用 mailto 宛先）
    contactToEmail = String(cfg.email || "").trim();
    if (contactForm) {
      contactForm.dataset.mailto = contactToEmail;
    }

    // SNS
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
  }

  // ✅ SNSアイコン：images.json の svg/url を優先 → なければフォールバック
  function iconForLabel(label) {
    const rawLabel = String(label || "").trim();
    const keyExact = rawLabel;
    const keyLower = norm(rawLabel);

    // 1) images.json の完全一致キー
    const iconExact = snsIconStore?.[keyExact];
    if (iconExact) return iconFromStore(iconExact);

    // 2) images.json の大小無視マッチ（YouTube / youtube など）
    if (snsIconStore && typeof snsIconStore === "object") {
      for (const k of Object.keys(snsIconStore)) {
        if (norm(k) === keyLower) {
          return iconFromStore(snsIconStore[k]);
        }
      }
    }

    // 3) フォールバック（軽量SVG）
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

    // TikTok
    if (l.includes("tiktok") || l.includes("tik tok")) {
      return `
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M16.6 2c.4 2.4 1.8 4.2 4.4 4.6v3.3c-1.6.1-3.1-.4-4.4-1.2v7.1c0 4-3.3 6.7-7.1 6.2-2.7-.4-5-2.7-5.4-5.5C3.5 12.9 6.4 10 10 10c.4 0 .8 0 1.2.1v3.6c-.3-.1-.6-.2-1-.2-1.8 0-3.2 1.5-3.2 3.3 0 1.8 1.4 3.3 3.2 3.3 2.1 0 3.3-1.6 3.3-3.7V2h3.1z"/>
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
  // Contact Form (統合フォーム)
  // ----------------------------
  function getInquiryType() {
    if (!contactForm) return "pre";
    const el = contactForm.querySelector('input[name="inquiryType"]:checked');
    return String(el?.value || "pre");
  }

  // ✅ ここが「ラジオごとの本文テンプレ」
  function templateForType(type) {
    if (type === "pre") {
      return [
        "【相談前の質問】",
        "",
        "現在のご職業(学生/社会人/その他）：",
        "",
        "志望大学/専攻（候補でもOK）：",
        "",
        "検討状況（情報収集中/出願準備中/出願済/合格後）：",
        "",
        "入学希望時期（例：2026年9月）：",
        "",
        "興味のある現役生（候補があれば）：",
        "",
        "聞きたいこと（箇条書き・最大3つ）：",
        "・",
        "・",
        "・",
      ].join("\n");
    }

    if (type === "post") {
      return [
        "【相談後の連絡】",
        "",
        "相談した現役生（名前/大学）：",
        "",
        "予約日時（例：2/12 20:00 JST）：",
        "",
        "連絡内容（箇条書き）：",
        "・",
        "・",
        "",
        "（日時変更が必要な場合）希望候補：",
        "・",
        "・",
      ].join("\n");
    }

    if (type === "student") {
      return [
        "【現役生登録】",
        "",
        "大学/専攻（プログラム名）：",
        "",
        "学年・課程：",
        "",
        "滞在都市：",
        "",
        "奨学金（スティペンディウム等）の有無：",
        "",
        "話せるテーマ（箇条書き）：",
        "・出願（英語要件/書類/面接）",
        "・生活費/家探し/治安",
        "・授業/試験/学生生活",
        "・",
        "",
        "対応可能な曜日・時間帯（日本時間JST）：",
        "・",
        "・",
        "",
        "一言プロフィール（任意・3行程度）：",
      ].join("\n");
    }

    if (type === "partner") {
      return [
        "【提携・取材・運営】",
        "",
        "所属/媒体（URL）：",
        "",
        "担当者名：",
        "",
        "目的（取材/提携/運営参加など）：",
        "",
        "希望内容（できるだけ具体的に）：",
        "",
        "希望時期/締切：",
        "",
        "連絡先（メール/その他）：",
      ].join("\n");
    }

    return "";
  }

  function noteForType(type) {
    // 下側に「予約は…」の重複表示は不要（セクション冒頭に1回出している）
    if (type === "pre") return "※ 質問は最大3つまで、箇条書きにすると回答が早くなります。";
    if (type === "post") return "※ 予約日時と相談した現役生が分かると、確認がスムーズです（JST推奨）。";
    if (type === "student") return "※ 現役生登録は、大学名・学年/課程の入力が必須です。";
    if (type === "partner") return "※ URLと希望時期/締切まで書くと、判断が早くなります。";
    return "";
  }

  function subjectForType(type, name) {
    const n = name || "（名前未入力）";
    if (type === "pre") return `【相談前の質問】${n}`;
    if (type === "post") return `【相談後の連絡】${n}`;
    if (type === "student") return `【現役生登録】${n}`;
    if (type === "partner") return `【提携/取材/運営】${n}`;
    return `【お問い合わせ】${n}`;
  }

  function setStudentFieldsVisible(isStudent) {
    if (cfUniWrap) cfUniWrap.classList.toggle("isHidden", !isStudent);
    if (cfYearWrap) cfYearWrap.classList.toggle("isHidden", !isStudent);

    if (cfUni) cfUni.required = !!isStudent;
    if (cfYear) cfYear.required = !!isStudent;

    // 非現役生に切り替えたときは値を残してもいいが、誤送信を減らすならクリア
    if (!isStudent) {
      if (cfUni) cfUni.value = "";
      if (cfYear) cfYear.value = "";
    }
  }

  function applyContactUiByType(type, forceTemplate = false) {
    const isStudent = type === "student";
    setStudentFieldsVisible(isStudent);

    // 本文テンプレ切替（途中入力は上書きしない）
    if (cfMessage) {
      const tpl = templateForType(type);
      const current = String(cfMessage.value || "").trim();
      if (forceTemplate || !current) {
        cfMessage.value = tpl;
      }
    }

    // 下側の補助（予約注意の重複は出さない）
    if (contactNoteEl) {
      contactNoteEl.textContent = noteForType(type);
    }
  }

  function buildContactMailto() {
    const to = (contactForm?.dataset?.mailto || contactToEmail || "").trim();

    const type = getInquiryType();
    const name = cfName?.value?.trim() || "";
    const email = cfEmail?.value?.trim() || "";
    const uni = cfUni?.value?.trim() || "";
    const year = cfYear?.value?.trim() || "";
    const message = cfMessage?.value?.trim() || "";

    const subject = subjectForType(type, name);

    const typeLabel =
      type === "pre"
        ? "志願者：相談前の質問"
        : type === "post"
        ? "志願者：相談後の連絡"
        : type === "student"
        ? "現役生：登録したい"
        : type === "partner"
        ? "提携・取材・運営"
        : "お問い合わせ";

    const bodyLines = [
      "お問い合わせ（LP）",
      "",
      `用件：${typeLabel}`,
      "",
      `お名前：${name}`,
      `メール：${email}`,
      ...(type === "student" ? [`大学名：${uni}`, `学年・課程：${year}`] : []),
      "",
      "本文：",
      message || "（本文なし）",
      "",
      "※ 予約は各現役生カードの「空き枠を見る」から行ってください（このフォームでは予約できません）。",
    ];

    const body = bodyLines.join("\n");
    return `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  function initContactForm() {
    if (!contactForm) return;

    // ラジオ変更で切替
    const radios = Array.from(contactForm.querySelectorAll('input[name="inquiryType"]'));
    radios.forEach((r) => {
      r.addEventListener("change", () => {
        const type = getInquiryType();
        applyContactUiByType(type, false);
      });
    });

    // 初期状態適用（テンプレは初回強制）
    applyContactUiByType(getInquiryType(), true);

    // submit: mailto 下書き
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const to = (contactForm?.dataset?.mailto || contactToEmail || "").trim();
      if (!to) {
        alert("送信先メールアドレス（config.json の email）が未設定です。");
        return;
      }

      const name = cfName?.value?.trim() || "";
      const email = cfEmail?.value?.trim() || "";

      if (!name) {
        alert("お名前（必須）を入力してください。");
        cfName?.focus();
        return;
      }
      if (!email) {
        alert("メールアドレス（必須）を入力してください。");
        cfEmail?.focus();
        return;
      }

      const type = getInquiryType();
      if (type === "student") {
        const uni = cfUni?.value?.trim() || "";
        const year = cfYear?.value?.trim() || "";
        if (!uni) {
          alert("大学名（現役生は必須）を入力してください。");
          cfUni?.focus();
          return;
        }
        if (!year) {
          alert("学年・課程（現役生は必須）を入力してください。");
          cfYear?.focus();
          return;
        }
      }

      const msg = cfMessage?.value?.trim() || "";
      if (!msg) {
        alert("本文（必須）を入力してください。");
        cfMessage?.focus();
        return;
      }

      window.location.href = buildContactMailto();
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
    if (!mapEl) return;
    if (!window.L) {
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
    // images は任意
    try {
      await loadImagesOptional();
    } catch (e) {
      console.warn("images.json 読み込みでエラー（無視して続行）:", e);
    }

    // students
    try {
      await loadStudents();
    } catch (e) {
      console.error(e);

      const msg = (e && e.message) ? e.message : String(e);

      if (studentListEl) {
        studentListEl.innerHTML = `<div class="card" style="padding:16px">
          <div style="font-weight:950;color:#0f2a5a">現役生一覧の読み込みに失敗しました</div>
          <div class="muted" style="font-weight:850; margin-top:6px">原因：</div>
          <div style="margin-top:6px;white-space:pre-wrap;font-weight:850;color:#374151">${esc(msg)}</div>
        </div>`;
      }
      setHitLabel("");
    }

    // config（SNS + contact宛先）
    try {
      await loadConfig();
    } catch (e) {
      console.error(e);
    }

    // contact form init（config後でOK）
    try {
      initContactForm();
    } catch (e) {
      console.error(e);
    }

    // map
    try {
      initMap();
    } catch (e) {
      console.error(e);
      if (mapStatusEl) mapStatusEl.textContent = "地図の初期化でエラー";
    }
  })();
});
