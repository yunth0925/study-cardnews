/*
  카드뉴스 화면 그리기 + 넘기기
  ------------------------------------------------------------
  1) cards.js의 CARDS 데이터를 읽어서 카드 HTML을 만들어요.
  2) 카드를 화면 크기에 맞게 확대/축소해요.
  3) 스와이프, 화살표 버튼, 키보드 ←/→ 로 넘길 수 있어요.
  4) 검색창 글자가 타이핑되는 효과가 있어요.
*/

(function () {
  const CARD_W = 540;
  const CARD_H = 675;

  // 타이핑 효과 설정 — 끄고 싶으면 TYPING을 false로 바꾸세요
  const TYPING = true;
  const COVER_TYPE_MS = 90;     // 표지: 한 글자당 시간 (밀리초)
  const CARD_TYPE_TOTAL = 450;  // 다른 카드: 전체 타이핑 시간 (0.5초 이내)

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stage = document.getElementById("stage");
  const track = document.getElementById("track");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const homeBtn = document.getElementById("homeBtn");
  const pdfBtn = document.getElementById("pdfBtn");

  let current = 0;
  let scale = 1;

  // 페이지 번호 자동 매기기: 표지는 0, 그다음부터 1, 2, 3 …
  CARDS.forEach((c, i) => { c.no = i; });
  const TOTAL_PAGES = CARDS.length - 1;

  // 챕터별 탭 붙이기: 챕터 시작 카드(D)의 tabs를 그 뒤 카드들이 순서대로 나눠 가져요
  let chapter = null;
  CARDS.forEach((c, i) => {
    if (c.type === "D") { chapter = { tabs: c.tabs || [], start: i + 1 }; return; }
    if (!chapter || c.type === "cover" || c.type === "end") return;
    c.tabs = chapter.tabs;
    c.activeTab = i - chapter.start;
    c.tabTargets = chapter.tabs.map((_, k) => chapter.start + k); // 탭을 누르면 갈 카드
  });

  /* ---------- 작은 도우미들 ---------- */
  const pad2 = (n) => String(n).padStart(2, "0");
  const pageNo = (c) => `<span class="page-no">${pad2(c.no)} / ${TOTAL_PAGES}</span>`;

  // 일반 돋보기 아이콘 (초록 원 + 흰 돋보기) — 큰 두두가 있는 카드용
  const iconSearchBtn = () => `
    <span class="search-btn icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round">
        <circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/>
      </svg>
    </span>`;

  // 돋보기 두두 버튼 — 나머지 카드용
  const doduSearchBtn = () => `
    <span class="search-btn dodu">
      <img src="assets/dodu/search_icon.png" alt="돋보기를 든 두두 검색 버튼">
    </span>`;

  const searchbar = (query, withDodu) => `
    <div class="searchbar" role="search" aria-label="검색어: ${query}">
      <span class="query"><span class="qtext" data-text="${query}">${query}</span><span class="caret" aria-hidden="true"></span></span>
      ${withDodu ? doduSearchBtn() : iconSearchBtn()}
    </div>`;

  const tabs = (c) => (c.tabs && c.tabs.length) ? `
    <ul class="tabs" aria-label="이 챕터의 카드">
      ${c.tabs.map((t, i) => `<li class="${i === c.activeTab ? "active" : ""}">
        <button type="button" data-goto="${c.tabTargets[i]}"${i === c.activeTab ? ` aria-current="page"` : ""}>${t}</button>
      </li>`).join("")}
    </ul>` : "";

  const searchHeader = (c) => `
    <header class="search-header">
      ${searchbar(c.query, true)}
      ${tabs(c)}
    </header>`;

  const footer = (c) => `
    <footer class="card-footer">
      <span>연관 검색어 · <span class="tags">${(c.tags || []).join(" ")}</span></span>
      ${pageNo(c)}
    </footer>`;

  const spines = () => `<span class="spines" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`;

  const chips = (label, list) => (list && list.length) ? `
    ${label ? `<p class="chips-label">${label}</p>` : ""}
    <div class="chips">${list.map((m) => `<span class="chip">${m}</span>`).join("")}</div>` : "";

  /* ---------- 레이아웃별 그리기 ---------- */
  const renderers = {
    /* 표지 */
    cover: (c) => `
      <div class="floor" aria-hidden="true"></div>
      <div class="top-row">
        <span class="school">${c.school}</span>
        <span class="top-chip">${c.chip}</span>
      </div>
      <p class="subtitle">${c.subtitle}</p>
      <h1 class="cover-title">${c.title}</h1>
      ${searchbar(c.query, false)}
      <img class="cover-img" src="${c.image}" alt="${c.imageAlt}">
      <div class="cover-footer">
        ${spines()}
        <span>${c.hint}</span>
        <span class="spacer"></span>
      </div>`,

    /* A · 결과 리스트형 */
    A: (c) => `
      ${searchHeader(c)}
      <div class="card-body">
        <p class="meta">${c.meta}</p>
        <h2 class="card-title">${c.title}</h2>
        <div class="results">
          ${c.items.map((it) => `
            <div class="result">
              <span class="callno ${it.label}">${c.check
                ? `020<br><span class="check">✓</span>`
                : `020<br>${it.code || ""}`}</span>
              <div>
                <h3>${it.title}</h3>
                ${it.desc ? `<p>${it.desc}</p>` : ""}
              </div>
            </div>`).join("")}
        </div>
        ${chips(c.moreLabel, c.more)}
      </div>
      ${footer(c)}`,

    /* B · 지식 패널형 */
    B: (c) => `
      ${searchHeader(c)}
      <div class="card-body">
        <p class="meta">${c.meta}</p>
        <section class="panel">
          <div class="panel-top">
            <p class="small">${c.panel.small}</p>
            <p class="big">${c.panel.big}</p>
            ${c.panel.sub ? `<p class="sub">${c.panel.sub}</p>` : ""}
          </div>
          <table>
            ${c.rowsHead ? `<thead><tr><th>${c.rowsHead[0]}</th><th>${c.rowsHead[1]}</th></tr></thead>` : ""}
            <tbody>
              ${c.rows.map(([k, v]) => `<tr><th scope="row">${k}</th><td>${v}</td></tr>`).join("")}
            </tbody>
          </table>
        </section>
        ${c.box ? `<div class="mini-box"><strong>${c.box.title}</strong><p>${c.box.text}</p></div>` : ""}
        ${c.note ? `<p class="note">${c.note}</p>` : ""}
        ${chips(c.chipsLabel, c.chips)}
      </div>
      ${footer(c)}`,

    /* T · 학년별 표 */
    T: (c) => `
      ${searchHeader(c)}
      <div class="card-body">
        <p class="meta">${c.meta}</p>
        <h2 class="card-title">${c.title}</h2>
        <table class="year-table">
          <thead><tr><th></th>${c.cols.map((t) => `<th scope="col">${t}</th>`).join("")}</tr></thead>
          <tbody>
            ${c.years.map((y) => `
              <tr>
                <th scope="row">${y.year}</th>
                ${y.terms.map((list) => `<td>${list.map((x) => `<span>${x}</span>`).join("")}</td>`).join("")}
              </tr>`).join("")}
          </tbody>
        </table>
      </div>
      ${footer(c)}`,

    /* C · 이미지 탭형 */
    C: (c) => `
      ${searchHeader(c)}
      <div class="card-body">
        <p class="meta">${c.meta}</p>
        <h2 class="card-title">${c.title}</h2>
      </div>
      <div class="photo-grid">
        ${c.photos.map((p) => `
          <figure class="photo">
            <img src="${p.src}" alt="${p.alt}">
            <figcaption>${p.caption}</figcaption>
          </figure>`).join("")}
      </div>
      ${footer(c)}`,

    /* D · 챕터 시작형 */
    D: (c) => `
      ${searchbar(c.query, false)}
      <p class="chapter-meta"><span>${c.meta}</span>${pageNo(c)}</p>
      <p class="chapter-label">${c.chapter}</p>
      <h2 class="chapter-title">${c.title}</h2>
      <ol class="toc${c.toc.length > 4 ? " dense" : ""}" aria-label="이 챕터에서 볼 내용">
        ${c.toc.map((t, i) => `<li><b>${pad2(i + 1)}</b>${t}</li>`).join("")}
      </ol>
      <img class="chapter-img" src="${c.image}" alt="${c.imageAlt}">
      <div class="spine-band" aria-hidden="true"></div>`,

    /* E · Q&A형 */
    E: (c) => `
      ${searchHeader(c)}
      <div class="card-body">
        <p class="meta">${c.meta}</p>
        <div class="qna">
          ${c.qna.map((x) => `
            <div class="qna-item">
              <div class="qna-q"><span class="q-mark" aria-hidden="true">Q</span><h3>${x.q}</h3></div>
              ${x.who ? `<p class="qna-who">${x.who}</p>` : ""}
              <div class="qna-a">
                ${x.accepted ? `<span class="accepted">✔ 채택된 답변 · 대구대 문헌정보학과</span>` : ""}
                ${x.a}
              </div>
            </div>`).join("")}
        </div>
      </div>
      ${footer(c)}`,

    /* 마지막 카드 */
    end: (c) => `
      ${searchbar(c.query, false)}
      <p class="chapter-meta"><span>${c.meta}</span>${pageNo(c)}</p>
      <h2 class="chapter-title">${c.title}</h2>
      <ul class="links">
        ${c.links.map((l) => `
          <li><span class="name">${l.name}</span>
            ${l.href
              ? `<a href="${l.href}"${l.href.startsWith("http") ? ` target="_blank" rel="noopener"` : ""}>${l.text}</a>`
              : `<span>${l.text}</span>`}
          </li>`).join("")}
      </ul>
      <button class="restart-btn" type="button" data-action="restart">${c.restart}</button>
      <img class="end-img" src="${c.image}" alt="${c.imageAlt}">
      <div class="spine-band" aria-hidden="true"></div>`
  };

  /* ---------- 카드 전부 만들기 ---------- */
  function build() {
    track.innerHTML = CARDS.map((c, i) => {
      const draw = renderers[c.type];
      const label = c.type === "cover" ? "표지" : `${pad2(c.no)}번 카드`;
      const classes = [
        "card",
        c.type === "cover" ? "cover" : "type-" + c.type,
        c.compact ? "compact" : "",
        c.check ? "is-check" : "",
        c.tight ? "tight" : ""     // 내용이 넘칠 때 cards.js에 tight: true 를 넣으면 패널이 작아져요
      ].join(" ");
      return `
        <article class="${classes}" aria-roledescription="카드" aria-label="${label}" data-index="${i}">
          ${draw ? draw(c) : `<p style="padding:24px">아직 만들지 않은 레이아웃: ${c.type}</p>`}
        </article>`;
    }).join("");
  }

  /* ---------- 화면에 맞게 확대/축소 ---------- */
  function fit() {
    const introH = document.querySelector(".intro").offsetHeight + 12; // 카드 위 안내 + 간격
    const controlsH = introH + 44 + 12 + 40 + 12 + 24; // 위 안내 + 조작 줄 + 간격 + 아래 버튼 줄 + 간격 + 위아래 여백
    const availW = window.innerWidth;
    const availH = window.innerHeight - controlsH;
    scale = Math.min(availW / CARD_W, availH / CARD_H);
    stage.style.width = CARD_W * scale + "px";
    stage.style.height = CARD_H * scale + "px";
    stage.style.borderRadius = (availW <= CARD_W * scale + 1 ? 0 : 18) + "px";
    go(current, false);
  }

  /* ---------- 검색창 타이핑 효과 ---------- */
  let typingTimer = null;

  function typeQuery(cardEl, isCover) {
    clearInterval(typingTimer);
    const el = cardEl.querySelector(".qtext");
    if (!el) return;
    const text = el.dataset.text;
    if (!TYPING || reduceMotion) { el.textContent = text; return; }

    const chars = Array.from(text);
    const step = isCover ? COVER_TYPE_MS : Math.max(15, CARD_TYPE_TOTAL / chars.length);
    let n = 0;
    el.textContent = "";
    typingTimer = setInterval(() => {
      n += 1;
      el.textContent = chars.slice(0, n).join("");
      if (n >= chars.length) clearInterval(typingTimer);
    }, step);
  }

  /* ---------- 카드 이동 ---------- */
  function go(index, animate = true) {
    const prev = current;
    current = Math.max(0, Math.min(CARDS.length - 1, index));
    track.classList.toggle("dragging", !animate);
    track.style.transform = `scale(${scale}) translateX(${-current * CARD_W}px)`;

    // 지금 보이는 카드만 화면 읽기 프로그램과 Tab 키가 닿도록
    const cardEls = track.querySelectorAll(".card");
    cardEls.forEach((el, i) => {
      const on = i === current;
      el.setAttribute("aria-hidden", on ? "false" : "true");
      el.inert = !on;
    });

    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === CARDS.length - 1;
    progressFill.style.width = ((current + 1) / CARDS.length) * 100 + "%";
    const c = CARDS[current];
    progressText.textContent = c.type === "cover" ? "표지" : `${pad2(c.no)} / ${TOTAL_PAGES}`;

    if (animate && prev !== current) typeQuery(cardEls[current], c.type === "cover");
  }

  prevBtn.addEventListener("click", () => go(current - 1));

  // 카드 아래 "처음으로" 버튼
  homeBtn.addEventListener("click", () => go(0));

  /* ---------- 카드 아래 "PDF 저장" 버튼 ----------
     인쇄 창을 거치지 않고 바로 PDF 파일을 내려받아요.
     카드만 한 장씩 그림으로 찍어서 PDF 한 쪽에 하나씩 넣어요.
     (날짜·링크·버튼 같은 건 들어가지 않아요)
     - html2canvas: 화면의 카드를 그림으로 찍어 주는 도구
     - jsPDF: 그림들을 모아 PDF 파일로 만들어 주는 도구
     두 도구는 버튼을 처음 누를 때만 불러와요. */
  const PDF_FILE = "대구대_문헌정보학과_카드뉴스.pdf";
  const PDF_SCALE = 2;    // 2배 해상도로 찍어서 글자가 선명하게

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = src;
      s.onload = resolve;
      s.onerror = () => reject(new Error("불러오기 실패: " + src));
      document.head.appendChild(s);
    });
  }

  async function loadPdfTools() {
    if (!window.html2canvas) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js");
    if (!window.jspdf) await loadScript("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  }

  // 찍기 직전, 복사본 화면에서 i번째 카드만 남기고 정리해요 (진짜 화면은 그대로)
  function prepareClone(doc, i) {
    const t = doc.getElementById("track");
    t.style.transform = "none";
    t.style.transition = "none";
    const st = doc.getElementById("stage");
    st.style.cssText = `width:${CARD_W}px;height:${CARD_H}px;overflow:visible;border-radius:0;box-shadow:none;`;
    // 카드 말고 다른 것(위 안내, 아래 버튼)은 복사본에서 숨겨요
    doc.querySelectorAll(".intro, .controls, .extra-actions").forEach((el) => { el.style.display = "none"; });
    const v = doc.querySelector(".viewer");
    v.style.cssText = "display:block;height:auto;padding:0;";
    t.querySelectorAll(".card").forEach((el, k) => { if (k !== i) el.style.display = "none"; });

    const card = t.querySelector(`.card[data-index="${i}"]`);
    // 검색창 글자를 다 채우고, 깜빡이는 커서는 숨겨요
    card.querySelectorAll(".qtext").forEach((el) => { el.textContent = el.dataset.text; });
    card.querySelectorAll(".caret, .restart-btn").forEach((el) => { el.style.display = "none"; }); // PDF에선 못 누르는 버튼도 숨겨요

    // html2canvas는 object-fit을 못 그려서 그림이 찌그러져요 → 같은 모양의 배경 그림으로 바꿔요
    card.querySelectorAll("img").forEach((img) => {
      const cs = doc.defaultView.getComputedStyle(img);
      if (cs.objectFit !== "contain" && cs.objectFit !== "cover") return;
      const box = doc.createElement("div");
      box.className = img.className;
      ["position", "top", "right", "bottom", "left", "width", "height", "display", "margin", "border-radius", "z-index"]
        .forEach((p) => box.style.setProperty(p, cs.getPropertyValue(p)));
      box.style.backgroundImage = `url("${img.src}")`;
      box.style.backgroundSize = cs.objectFit;
      box.style.backgroundPosition = cs.objectPosition;
      box.style.backgroundRepeat = "no-repeat";
      img.replaceWith(box);
    });
  }

  let pdfBusy = false;
  pdfBtn.addEventListener("click", async () => {
    if (pdfBusy) return;
    pdfBusy = true;
    const label = pdfBtn.innerHTML;
    pdfBtn.disabled = true;
    try {
      pdfBtn.textContent = "PDF 준비 중…";
      await loadPdfTools();
      if (document.fonts && document.fonts.ready) await document.fonts.ready;

      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: "portrait", unit: "px", format: [CARD_W, CARD_H], hotfixes: ["px_scaling"] });
      const cardEls = track.querySelectorAll(".card");

      for (let i = 0; i < cardEls.length; i++) {
        pdfBtn.textContent = `PDF 만드는 중… ${i + 1} / ${cardEls.length}`;
        const canvas = await html2canvas(cardEls[i], {
          scale: PDF_SCALE,
          useCORS: true,
          backgroundColor: "#ffffff",
          logging: false,
          width: CARD_W,
          height: CARD_H,
          windowWidth: CARD_W,
          windowHeight: CARD_H,
          scrollX: 0,
          scrollY: 0,
          onclone: (doc) => prepareClone(doc, i)
        });
        // 카드만 쪽에 꽉 차게 (테두리·배경 없이)
        if (i > 0) pdf.addPage([CARD_W, CARD_H], "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.92), "JPEG", 0, 0, CARD_W, CARD_H);
      }
      pdf.save(PDF_FILE);
    } catch (err) {
      console.error(err);
      alert("PDF를 만들지 못했어요. 인터넷 연결을 확인하고 다시 눌러 주세요.");
    } finally {
      pdfBtn.innerHTML = label;
      pdfBtn.disabled = false;
      pdfBusy = false;
    }
  });
  nextBtn.addEventListener("click", () => go(current + 1));

  // "처음으로 돌아가기" 버튼
  track.addEventListener("click", (e) => {
    if (e.target.closest("[data-action='restart']")) go(0);
    const tab = e.target.closest("[data-goto]");
    if (tab) go(Number(tab.dataset.goto));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") go(current + 1);
    if (e.key === "ArrowLeft") go(current - 1);
  });

  /* ---------- 스와이프 (손가락/마우스 끌기) ---------- */
  let startX = null;
  let startY = null;
  let dx = 0;

  stage.addEventListener("pointerdown", (e) => {
    if (e.target.closest("a, button")) return; // 링크·버튼은 그대로 눌리게
    startX = e.clientX;
    startY = e.clientY;
    dx = 0;
    track.classList.add("dragging");
    stage.setPointerCapture(e.pointerId);
  });

  stage.addEventListener("pointermove", (e) => {
    if (startX === null) return;
    dx = e.clientX - startX;
    if (Math.abs(e.clientY - startY) > Math.abs(dx)) return; // 세로 움직임이면 무시
    track.style.transform = `scale(${scale}) translateX(${-current * CARD_W + dx / scale}px)`;
  });

  function endDrag() {
    if (startX === null) return;
    startX = null;
    const threshold = 50; // 50px 이상 끌면 넘어가요
    if (dx < -threshold) go(current + 1);
    else if (dx > threshold) go(current - 1);
    else go(current);
  }
  stage.addEventListener("pointerup", endDrag);
  stage.addEventListener("pointercancel", endDrag);

  /* ---------- 시작 ---------- */
  build();
  // 주소 끝에 #3 처럼 붙이면 3번째 장(표지=1)부터 보여줘요
  const fromHash = parseInt(location.hash.slice(1), 10);
  if (fromHash > 0) current = fromHash - 1;
  fit();
  window.addEventListener("resize", fit);

  // 처음 열었을 때 표지 검색창 타이핑 (조금 쉬었다가 시작)
  if (current === 0) {
    const coverQ = track.querySelector(".cover .qtext");
    if (coverQ && TYPING && !reduceMotion) coverQ.textContent = "";
    setTimeout(() => typeQuery(track.children[0], true), 500);
  }
})();
