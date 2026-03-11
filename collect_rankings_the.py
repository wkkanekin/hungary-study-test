<!doctype html>
<html lang="ja">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>大学の探し方｜ハンガリー留学</title>

  <link rel="stylesheet" href="basics-university.css" />
</head>

<body>
  <div class="container">

    <header class="section">
      <h1>大学の探し方</h1>
      <p class="muted" style="text-align:center; max-width:820px; margin:12px auto 0;">
        「何から調べればいいのか？」を、迷わない順番でまとめています。<br />
        候補の出し方から要件確認、絞り込みまで、このページで整理できます。
      </p>
    </header>

    <!-- Hero -->
    <section class="section">
      <div class="card heroWrap">
        <img id="imgHero" class="heroImg" src="images/university-campus.jpg" alt="大学キャンパス" />
      </div>
    </section>

    <!-- 30秒まとめ -->
    <section class="section">
      <h2>まずこれだけ（30秒で全体像）</h2>
      <div class="card simpleCard">
        <ol class="stepList">
          <li>学びたい<b>分野</b>を決めます（大枠で問題ありません）。</li>
          <li>取得したい<b>学位</b>を決めます（学士・修士・博士など）。</li>
          <li>候補の大学・プログラムを広めに出します。</li>
          <li>要件を確認し、現実的な大学に絞ります。</li>
        </ol>

        <div class="noteBox">
          最初から1校に絞る必要はありません。<br />
          まずは候補を広く出し、あとから条件で絞ると進めやすいです。
        </div>
      </div>
    </section>

    <!-- 候補の出し方 -->
    <section class="section">
      <h2>① 候補の出し方</h2>

      <div class="card heroWrap" style="margin-bottom:12px;">
        <img id="imgSearch" class="heroImg" src="images/dummy.jpg" alt="大学・プログラムを探すイメージ" />
      </div>

      <div class="card simpleCard">
        <h3 style="margin-top:0;">ステップ</h3>
        <ol class="stepList">
          <li>専攻分野を決めます（例：医学・工学・IT・経営・心理など）。</li>
          <li>学位を決めます（学士・修士・博士など）。</li>
          <li>英語で学べるプログラムを中心に候補を拾います。</li>
        </ol>

        <div class="noteBox">
          ハンガリー政府公式のプログラム検索サイト「Study Finder」では、英語で学べる学位プログラムを検索できます。<br />
          分野・学位・大学名などで絞り込みができるため、まずはここで候補を広く出すと進めやすいです。
          <br /><br />
          <a
            href="https://studyinhungary.hu/study-in-hungary/menu/find-a-study-programme/study-finder.html"
            target="_blank"
            rel="noopener"
            class="btn primary"
          >
            Study Finder で探す
          </a>
        </div>

        <div class="noteBox">
          この段階では「合格できそうか」まで考えなくて大丈夫です。<br />
          まずは候補を出し、次のステップで要件に合うものへ絞っていきます。
        </div>
      </div>
    </section>

    <!-- 要件チェック -->
    <section class="section">
      <h2>② 要件チェック（ここが重要です）</h2>

      <div class="card heroWrap" style="margin-bottom:12px;">
        <img id="imgRequirements" class="heroImg" src="images/dummy.jpg" alt="出願要件を確認するイメージ" />
      </div>

      <div class="card simpleCard">
        <h3 style="margin-top:0;">確認すべきポイント</h3>
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li><b>英語要件</b>（スコア提出・面接・学内試験など）</li>
          <li><b>成績条件</b>や前提科目</li>
          <li><b>入学試験</b>の有無</li>
          <li><b>必要書類</b>（推薦状・CV・研究計画書・ポートフォリオなど）</li>
          <li><b>締切日</b>（奨学金と大学側で別の場合もあります）</li>
        </ul>

        <h3>英語要件の例</h3>
        <div class="tableWrap">
          <table>
            <thead>
              <tr>
                <th>項目</th>
                <th>例</th>
                <th>ポイント</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><b>英語レベル</b></td>
                <td>CEFR <b>B2</b> など</td>
                <td>専攻によってC1が必要な場合もあります。</td>
              </tr>
              <tr>
                <td><b>試験スコア</b></td>
                <td>IELTS <b>5.5</b> など</td>
                <td>面接や学内試験で代替できる場合もあります。</td>
              </tr>
              <tr>
                <td><b>証明方法</b></td>
                <td>スコア提出または面接</td>
                <td>大学ごとに方式が異なるため、必ず確認します。</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="noteBox">
          入学できる最低ラインだけでなく、授業についていけるかも重要です。<br />
          特に理系・医学系は専門英語の負荷が大きくなりやすいです。
        </div>
      </div>
    </section>

    <!-- 自動更新セクション -->
    <section class="section" id="admissions-db">
      <h2>③ 英語プログラムの要件一覧（月1更新）</h2>

      <div class="card simpleCard">
        <p class="muted" id="admissionsMeta" style="margin-top:0;">
          読み込み中…
        </p>

        <div class="filterBox">
          <div class="filterGrid">
            <div>
              <label for="filterKeyword" class="filterLabel">大学名・学部・プログラム名</label>
              <input id="filterKeyword" type="text" placeholder="例：ELTE / Medicine / Engineering / Business" />
            </div>

            <div>
              <label for="filterExamType" class="filterLabel">試験形式</label>
              <select id="filterExamType">
                <option value="">指定なし</option>
                <option value="oral">oral を含む</option>
                <option value="written">written を含む</option>
                <option value="no">試験なしに近いもの</option>
              </select>
            </div>
          </div>

          <div class="filterActions">
            <button class="btn primary" type="button" id="applyAdmissionFilter">絞り込む</button>
            <button class="btn" type="button" id="clearAdmissionFilter">条件クリア</button>
          </div>
        </div>

        <div class="tableWrap">
          <table>
            <thead>
              <tr>
                <th>大学</th>
                <th>学部</th>
                <th>プログラム</th>
                <th>英語要件</th>
                <th>入試</th>
                <th>試験形式</th>
                <th>試験内容</th>
              </tr>
            </thead>
            <tbody id="admissionsTbody">
              <tr><td colspan="7">読み込み中…</td></tr>
            </tbody>
          </table>
        </div>

        <p class="muted" style="margin-bottom:0;">
          ※ Stipendium Hungaricum の英語プログラム情報をもとに自動抽出しています。<br />
          ※ 最終確認は必ず各プログラム公式ページで行ってください。
        </p>
      </div>
    </section>

    <!-- 専攻別傾向 -->
    <section class="section">
      <h2>④ 専攻別の傾向</h2>

      <div class="card heroWrap" style="margin-bottom:12px;">
        <img id="imgPatterns" class="heroImg" src="images/dummy.jpg" alt="専攻別の選考傾向のイメージ" />
      </div>

      <div class="card simpleCard">

        <h3 style="margin-top:0;">医学・歯学・薬学</h3>
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li>筆記試験と面接がある場合が多いです。</li>
          <li>入学後の試験も難易度が高い傾向があります。</li>
        </ul>

        <h3>理工・IT</h3>
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li>数学や論理の試験がある場合があります。</li>
          <li>面接のみのプログラムもあります。</li>
        </ul>

        <h3>人文・社会・ビジネス</h3>
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li>書類の完成度が重視される傾向があります。</li>
          <li>大学院では研究計画書が重要になりやすいです。</li>
        </ul>

        <h3>芸術系</h3>
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li>ポートフォリオや実技審査が中心です。</li>
          <li>制作準備に時間がかかるため、早めに動くと安心です。</li>
        </ul>

        <h3>博士課程</h3>
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li>研究計画書が最重要になりやすいです。</li>
          <li>指導教員との研究テーマの一致が重要です。</li>
        </ul>

        <div class="noteBox">
          専攻ごとの「試験の実態」や「準備の優先順位」は、公式情報だけでは分かりにくいことがあります。<br />
          現役生の体験談を聞くと、準備の精度が上がりやすいです。
        </div>

      </div>
    </section>

    <!-- 絞り込み -->
    <section class="section">
      <h2>⑤ 最後に絞り込むポイント</h2>
      <div class="card simpleCard">
        <ul style="margin:0; padding-left:18px; line-height:1.9;">
          <li><b>要件を満たしているか</b>を確認します（英語・成績・試験の有無など）。</li>
          <li><b>必要書類の重さ</b>を比較します（推薦状、研究計画書、ポートフォリオなど）。</li>
          <li><b>締切までに準備が間に合うか</b>を確認します。</li>
          <li><b>都市と生活費</b>も合わせて考えます（家賃の差が大きいです）。</li>
        </ul>

        <div class="noteBox">
          ここまで進めると、出願先は自然に3〜8校に絞られます。<br />
          迷う場合は「準備が間に合う順」を優先すると進めやすいです。
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="section">
      <div class="card simpleCard" style="text-align:center;">
        <h2>候補が出たら、次は現実性の確認です</h2>
        <p style="max-width:760px; margin:0 auto 14px;">
          「この大学は自分に合っているのか」「試験はどの程度難しいのか」「準備の優先順位は何か」など、<br />
          一人では判断しづらい部分があります。
          現役生の一次情報を取ると、やることが具体的になりやすいです。
        </p>
        <a href="index.html#students" class="btn primary">現役生を探す</a>
        <div style="margin-top:10px;">
          <a href="index.html" class="btn">トップページに戻る</a>
        </div>
      </div>
    </section>

    <footer class="footer">
      ハンガリー現役大学生によるオンライン留学相談
    </footer>

  </div>

  <script>
  document.addEventListener("DOMContentLoaded", async () => {
    const map = {
      hero: "imgHero",
      search: "imgSearch",
      requirements: "imgRequirements",
      patterns: "imgPatterns"
    };

    const admissionsMetaEl = document.getElementById("admissionsMeta");
    const admissionsTbodyEl = document.getElementById("admissionsTbody");
    const filterKeywordEl = document.getElementById("filterKeyword");
    const filterExamTypeEl = document.getElementById("filterExamType");
    const applyAdmissionFilterBtn = document.getElementById("applyAdmissionFilter");
    const clearAdmissionFilterBtn = document.getElementById("clearAdmissionFilter");

    let admissionRows = [];

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

    function shorten(str, max = 160) {
      const s = String(str ?? "").trim();
      if (!s) return "—";
      if (s.length <= max) return s;
      return s.slice(0, max) + "…";
    }

    function loadImages() {
      return fetch("basics-university.images.json", { cache: "no-store" })
        .then((res) => {
          if (!res.ok) return null;
          return res.json();
        })
        .then((data) => {
          if (!data) return;
          const images = data.images || {};

          for (const key in map) {
            const el = document.getElementById(map[key]);
            if (!el) continue;
            if (images[key]?.url) el.src = images[key].url;
            if (images[key]?.alt) el.alt = images[key].alt;
          }
        })
        .catch(() => {
          console.log("画像JSONが読み込めませんでした");
        });
    }

    function flattenProgrammes(data) {
      const universities = Array.isArray(data?.universities) ? data.universities : [];
      const rows = [];

      for (const uni of universities) {
        const institution = String(uni?.institution || "");
        const programmes = Array.isArray(uni?.programmes) ? uni.programmes : [];

        for (const p of programmes) {
          rows.push({
            institution,
            faculty: String(p?.faculty || ""),
            programme: String(p?.programme || ""),
            english_requirement: String(
              p?.english_requirement ||
              p?.entry_requirements ||
              p?.language_requirement ||
              ""
            ),
            entrance_exam: String(p?.entrance_exam || ""),
            entrance_exam_type: String(p?.entrance_exam_type || ""),
            entrance_exam_location: String(p?.entrance_exam_location || ""),
            entrance_exam_description: String(p?.entrance_exam_description || ""),
            course_url: String(p?.course_url || "")
          });
        }
      }

      return rows.sort((a, b) => {
        const aa = `${a.institution} ${a.faculty} ${a.programme}`.toLowerCase();
        const bb = `${b.institution} ${b.faculty} ${b.programme}`.toLowerCase();
        return aa.localeCompare(bb);
      });
    }

    function renderAdmissions(rows) {
      if (!admissionsTbodyEl) return;

      if (!rows.length) {
        admissionsTbodyEl.innerHTML = '<tr><td colspan="7">該当データがありません</td></tr>';
        return;
      }

      admissionsTbodyEl.innerHTML = "";

      for (const row of rows) {
        const examText = row.entrance_exam || "";
        const examTypeText = row.entrance_exam_type || "";
        const descriptionText = row.entrance_exam_description || "";
        const linkedProgramme = row.course_url
          ? `<a href="${esc(row.course_url)}" target="_blank" rel="noopener">${esc(row.programme || "詳細ページ")}</a>`
          : esc(row.programme || "—");

        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td>${esc(row.institution || "—")}</td>
          <td>${esc(row.faculty || "—")}</td>
          <td>${linkedProgramme}</td>
          <td>${esc(shorten(row.english_requirement, 140))}</td>
          <td>${esc(shorten(examText, 60))}</td>
          <td>${esc(shorten(examTypeText, 60))}</td>
          <td>${esc(shorten(descriptionText, 220))}</td>
        `;
        admissionsTbodyEl.appendChild(tr);
      }
    }

    function applyAdmissionFilter() {
      const keyword = norm(filterKeywordEl?.value);
      const examType = String(filterExamTypeEl?.value || "");

      const filtered = admissionRows.filter((row) => {
        const text = norm([
          row.institution,
          row.faculty,
          row.programme,
          row.english_requirement,
          row.entrance_exam,
          row.entrance_exam_type,
          row.entrance_exam_description,
          row.entrance_exam_location
        ].join(" "));

        const okKeyword = !keyword || text.includes(keyword);

        let okExamType = true;
        const typeText = norm([
          row.entrance_exam,
          row.entrance_exam_type,
          row.entrance_exam_description,
          row.entrance_exam_location
        ].join(" "));

        if (examType === "oral") {
          okExamType = typeText.includes("oral");
        } else if (examType === "written") {
          okExamType = typeText.includes("written");
        } else if (examType === "no") {
          okExamType =
            !typeText ||
            typeText.includes("no entrance exam") ||
            typeText.includes("without entrance exam") ||
            typeText.includes("none");
        }

        return okKeyword && okExamType;
      });

      renderAdmissions(filtered);
    }

    if (applyAdmissionFilterBtn) {
      applyAdmissionFilterBtn.addEventListener("click", applyAdmissionFilter);
    }

    if (clearAdmissionFilterBtn) {
      clearAdmissionFilterBtn.addEventListener("click", () => {
        if (filterKeywordEl) filterKeywordEl.value = "";
        if (filterExamTypeEl) filterExamTypeEl.value = "";
        renderAdmissions(admissionRows);
      });
    }

    if (filterKeywordEl) {
      filterKeywordEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
          applyAdmissionFilter();
        }
      });
    }

    await loadImages();

    try {
      const res = await fetch("sh_admissions.json?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) {
        throw new Error("sh_admissions.json の取得に失敗しました");
      }

      const data = await res.json();
      admissionRows = flattenProgrammes(data);

      if (admissionsMetaEl) {
        admissionsMetaEl.textContent =
          `最終更新：${data?.generated_at || "不明"} / 大学数：${data?.university_count || 0} / プログラム数：${data?.programme_count || 0}`;
      }

      renderAdmissions(admissionRows);
    } catch (e) {
      console.error(e);

      if (admissionsMetaEl) {
        admissionsMetaEl.textContent = "要件データの読み込みに失敗しました";
      }

      if (admissionsTbodyEl) {
        admissionsTbodyEl.innerHTML = '<tr><td colspan="7">読み込みエラー</td></tr>';
      }
    }
  });
  </script>
</body>
</html>