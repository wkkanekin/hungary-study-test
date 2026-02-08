(() => {
  const $ = (id) => document.getElementById(id);

  const escapeHTML = (s = "") =>
    s.replace(/[&<>"']/g, (m) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])
    );

  let students = [];

  const studentListEl = $("studentList");
  const hitCountEl = $("hitCount");
  const noResultsEl = $("noResults");
  const snsGridEl = $("snsGrid");
  const contactEmailText = $("contactEmailText");
  const contactEmailLink = $("contactEmailLink");

  Promise.all([
    fetch("students.json").then((r) => r.json()),
    fetch("config.json").then((r) => r.json())
  ])
    .then(([studentsData, config]) => {
      students = studentsData.filter((s) => s.enabled);
      renderStudents(students);
      renderSNS(config.socials || []);
      renderContact(config.email);
    })
    .catch((e) => console.error("JSON load error", e));

  function renderStudents(list) {
    studentListEl.innerHTML = "";
    hitCountEl.textContent = `おすすめ：${list.filter(s => s.featured).length}名`;

    list.filter(s => s.featured).forEach((s) => {
      const el = document.createElement("div");
      el.className = "studentCard";

      el.innerHTML = `
        <div class="studentTop">
          <div class="avatar"><img src="${escapeHTML(s.avatar)}"></div>
          <div>
            <div class="studentName">${escapeHTML(s.name)}</div>
            <span class="badgeMini">おすすめ</span>
          </div>
        </div>

        <p class="bio">${escapeHTML(s.bio)}</p>

        <div class="linkList">
          ${s.links.map(renderLink).join("")}
        </div>

        <div class="centerActions">
          ${
            s.bookingUrl && s.bookingUrl !== "#"
              ? `<a class="btn primary" href="${s.bookingUrl}" target="_blank">空き枠を見る</a>`
              : `<button class="btn" disabled>予約準備中</button>`
          }
        </div>
      `;
      studentListEl.appendChild(el);
    });
  }

  function renderLink(l) {
    if (l.enabled === false) {
      return `<span class="linkPill disabled">${escapeHTML(l.label)}（準備中）</span>`;
    }
    return `<a class="linkPill" href="${escapeHTML(l.url)}" target="_blank">${escapeHTML(
      l.label
    )}</a>`;
  }

  function renderSNS(socials) {
    snsGridEl.innerHTML = "";
    socials.forEach((s) => {
      const enabled = s.enabled !== false;
      const el = document.createElement(enabled ? "a" : "div");
      el.className = "snsItem" + (enabled ? "" : " disabled");

      if (enabled) {
        el.href = s.url;
        el.target = "_blank";
      }

      el.innerHTML = `
        <div class="snsIcon">${escapeHTML(s.label[0])}</div>
        <div class="snsLabel">${escapeHTML(s.label)}${enabled ? "" : "（準備中）"}</div>
      `;
      snsGridEl.appendChild(el);
    });
  }

  function renderContact(email) {
    if (!email) return;
    contactEmailText.textContent = email;
    contactEmailLink.href = `mailto:${email}`;
  }
})();
