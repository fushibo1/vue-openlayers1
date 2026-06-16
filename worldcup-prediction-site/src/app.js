const data = window.WORLD_CUP_DATA || { matches: [], rounds: [], teams: [] };
const app = document.querySelector("#app");
const navButtons = [...document.querySelectorAll("[data-nav]")];
const shareButton = document.querySelector("#shareButton");

const byId = new Map(data.matches.map((match) => [match.id, match]));
const roundById = new Map(data.rounds.map((round) => [round.id, round]));
const teamByName = new Map(data.teams.map((team) => [team.name, team]));

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function hashFor(route, value = "") {
  return value ? `#/${route}/${encodeURIComponent(value)}` : `#/${route}`;
}

function routeTo(route, value = "") {
  location.hash = hashFor(route, value);
}

function updateActiveNav(route) {
  navButtons.forEach((button) => {
    const target = button.dataset.nav;
    const active =
      target === route ||
      (route === "match" && target === "matches") ||
      (route === "round" && target === "rounds") ||
      (route === "team" && target === "teams");
    button.classList.toggle("active", active);
  });
}

function compactText(value = "", max = 86) {
  const text = value.replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

function metaLabel(match) {
  return `${match.group} · ${match.matchTime || "时间待定"}`;
}

function formatAccuracy(stats = {}) {
  return stats.accuracy == null ? "暂无" : `${stats.accuracy}%`;
}

function statusClass(match) {
  return match.result?.status === "completed" ? "completed" : "pending";
}

function settlementClass(match) {
  return match.result?.settlement?.outcome || "pending";
}

function renderStatusBadge(match) {
  return `<span class="badge status-${statusClass(match)}">${escapeHtml(match.result?.statusLabel || "未开始")}</span>`;
}

function renderSettlementBadge(match) {
  const result = match.result || {};
  const label = result.settlement?.label || result.statusLabel || "未开始";
  return `<span class="badge settlement-${settlementClass(match)}">${escapeHtml(label)}</span>`;
}

function renderAccuracyPanel(stats = data.stats, options = {}) {
  const recentSettled = data.matches
    .filter((match) => match.result?.status === "completed")
    .slice(-4)
    .reverse();

  return `
    <div class="accuracy-panel ${options.hero ? "hero-accuracy" : ""}">
      <div class="accuracy-head">
        <div>
          <span class="section-kicker">历史预测统计</span>
          <strong>${formatAccuracy(stats)}</strong>
        </div>
        <span class="badge settlement-win">${stats.correct || 0} 正确</span>
      </div>
      <div class="accuracy-grid">
        <div><span>已完赛</span><strong>${stats.completed || 0}</strong></div>
        <div><span>未开始</span><strong>${stats.pending || 0}</strong></div>
        <div><span>错误</span><strong>${stats.wrong || 0}</strong></div>
        <div><span>走水</span><strong>${stats.push || 0}</strong></div>
      </div>
      ${options.hero ? `
        <div class="settled-list">
          ${recentSettled.map((match) => `
            <a href="${hashFor("match", match.id)}">
              <span>${escapeHtml(match.teams.join(" vs "))}</span>
              <strong>${escapeHtml(match.result.scoreText || "-")}</strong>
              ${renderSettlementBadge(match)}
            </a>
          `).join("")}
        </div>
      ` : ""}
    </div>
  `;
}

function renderStatusPanel() {
  const totalRounds = data.rounds.length;
  return `
    <section class="status-panel">
      <div>
        <span>内容更新时间</span>
        <strong>${escapeHtml(data.generatedAt || "待导入")}</strong>
      </div>
      <div>
        <span>已收录</span>
        <strong>${data.matches.length} 场 · ${data.teams.length} 队</strong>
      </div>
      <div>
        <span>轮次专题</span>
        <strong>${totalRounds} 轮</strong>
      </div>
      <div>
        <span>亚盘命中率</span>
        <strong>${formatAccuracy(data.stats)}</strong>
      </div>
    </section>
  `;
}

function renderDisclaimer() {
  return `
    <section class="notice">
      <strong>赛前分析说明</strong>
      <p>本站内容用于赛事分析与朋友间交流，不构成任何投注、投资或其他决策建议。预测默认指 90 分钟含补时，不含加时与点球。</p>
    </section>
  `;
}

function renderMatchCard(match, options = {}) {
  const teams = match.teams || [];
  const summary = match.summary || match.asianLine || match.direction || "";
  const result = match.result || {};
  const pick = result.asianPick ? `${result.asianPick.team} ${result.asianPick.handicap}` : "-";
  return `
    <a class="match-card" href="${hashFor("match", match.id)}">
      <div class="meta-row">
        <span>${escapeHtml(metaLabel(match))}</span>
        ${renderStatusBadge(match)}
      </div>
      <div class="match-title">${escapeHtml(teams[0] || "")} <span class="card-kicker">vs</span> ${escapeHtml(teams[1] || "")}</div>
      <p class="card-summary">${escapeHtml(compactText(summary, options.long ? 130 : 76))}</p>
      <div class="scoreline">
        <div><span>亚盘观点</span><strong>${escapeHtml(pick)}</strong></div>
        <div><span>赛果</span><strong>${escapeHtml(result.scoreText || "未开始")}</strong></div>
        <div><span>结算</span><strong>${renderSettlementBadge(match)}</strong></div>
      </div>
    </a>
  `;
}

function renderHero() {
  if (!data.matches.length) {
    return `
      <section class="hero">
        <div>
          <span class="eyebrow">内容待导入</span>
          <h1>世界杯专题预测</h1>
          <p>运行 scripts/import-content.ps1 后，这里会自动展示比赛预测专题。</p>
        </div>
      </section>
    `;
  }

  return `
    <section class="hero">
      <div>
        <span class="eyebrow">2026 赛前模型专题</span>
        <h1>世界杯比赛预测</h1>
      </div>
      ${renderAccuracyPanel(data.stats, { hero: true })}
    </section>
  `;
}

function renderHome() {
  const groups = [...new Set(data.matches.map((match) => match.group))];
  const firstRound = data.rounds[0];

  app.innerHTML = `
    ${renderHero()}
    ${renderStatusPanel()}
    <section class="section">
      <div class="section-head">
        <div>
          <p>Round Index</p>
          <h2>轮次专题</h2>
        </div>
        <span class="badge">${data.matches.length} 场</span>
      </div>
      <div class="round-scroll">
        ${groups.map((group) => `<button class="chip" type="button" data-filter-group="${escapeHtml(group)}">${escapeHtml(group)}</button>`).join("")}
      </div>
      <div id="groupMatches" class="match-list">
        ${data.matches.slice(0, 4).map((match, index) => renderMatchCard(match, { hot: index === 0 })).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-head">
        <div>
          <p>Teams</p>
          <h2>球队历史预测</h2>
        </div>
        <button class="chip" type="button" data-open="teams">全部球队</button>
      </div>
      <div class="team-grid">
        ${data.teams.slice(0, 8).map(renderTeamCard).join("")}
      </div>
    </section>

    ${firstRound ? `
      <section class="section">
        <a class="round-card" href="${hashFor("round", firstRound.id)}">
          <span class="card-kicker">专题说明</span>
          <strong>${escapeHtml(firstRound.title)}</strong>
          <span>${escapeHtml(compactText(firstRound.description, 110))}</span>
        </a>
      </section>
    ` : ""}
    ${renderDisclaimer()}
  `;

  document.querySelectorAll("[data-filter-group]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-group]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      const groupMatches = data.matches.filter((match) => match.group === button.dataset.filterGroup);
      document.querySelector("#groupMatches").innerHTML = groupMatches.map((match) => renderMatchCard(match)).join("");
    });
  });

  document.querySelectorAll("[data-open]").forEach((button) => {
    button.addEventListener("click", () => routeTo(button.dataset.open));
  });
}

function renderMatches() {
  app.innerHTML = `
    <section class="section">
      <div class="section-head">
        <div>
          <p>Schedule</p>
          <h2>全部比赛</h2>
        </div>
        <span class="badge">${data.matches.length} 场预测</span>
      </div>
      <input id="searchInput" class="search-box" type="search" placeholder="搜索球队、分组、推荐方向" />
      <div id="matchList" class="match-list">
        ${data.matches.map((match) => renderMatchCard(match, { long: true })).join("")}
      </div>
    </section>
  `;
  bindSearch("matchList", (keyword) => {
    return data.matches.filter((match) => {
      const pool = `${match.group} ${match.teams.join(" ")} ${match.direction} ${match.asianLine} ${match.scorePrediction}`;
      return pool.toLowerCase().includes(keyword.toLowerCase());
    }).map((match) => renderMatchCard(match, { long: true })).join("");
  });
}

function renderRounds() {
  app.innerHTML = `
    <section class="section">
      <div class="section-head">
        <div>
          <p>Rounds</p>
          <h2>轮次专题</h2>
        </div>
      </div>
      <div class="round-list">
        ${data.rounds.map((round) => `
          <a class="round-card" href="${hashFor("round", round.id)}">
            <strong>${escapeHtml(round.title)}</strong>
            <span>${escapeHtml(round.matches.length)} 场 · 命中率 ${formatAccuracy(round.stats)} · ${escapeHtml(compactText(round.description, 90))}</span>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderRound(roundId) {
  const round = roundById.get(roundId) || data.rounds[0];
  if (!round) {
    renderEmpty("还没有轮次数据");
    return;
  }
  const matches = round.matches.map((id) => byId.get(id)).filter(Boolean);
  app.innerHTML = `
    <section class="detail-hero">
      <span class="eyebrow">轮次专题</span>
      <h1>${escapeHtml(round.title)}</h1>
      <p class="card-summary">${escapeHtml(round.description)}</p>
      <div class="prediction-strip">
        <div class="metric"><span>比赛数量</span><strong>${matches.length} 场</strong></div>
        <div class="metric"><span>覆盖球队</span><strong>${new Set(matches.flatMap((match) => match.teams)).size} 支</strong></div>
        <div class="metric"><span>已完赛</span><strong>${round.stats?.completed || 0} 场</strong></div>
        <div class="metric"><span>亚盘命中率</span><strong>${formatAccuracy(round.stats)}</strong></div>
      </div>
    </section>
    ${renderAccuracyPanel(round.stats)}
    ${renderDisclaimer()}
    <section class="section">
      <div class="match-list">
        ${matches.map((match) => renderMatchCard(match, { long: true })).join("")}
      </div>
    </section>
  `;
}

function renderTeamCard(team) {
  if (!team) return "";
  return `
    <a class="team-card" href="${hashFor("team", team.name)}">
      <strong>${escapeHtml(team.name)}</strong>
      <span>${escapeHtml(team.groups.join(" / "))} · ${team.matches.length} 条预测 · ${escapeHtml(team.stats?.primaryDirection || "历史记录")}</span>
    </a>
  `;
}

function renderHistoryStats(matches, team) {
  const directions = new Map();
  matches.forEach((match) => {
    const direction = match.direction || "未提取";
    directions.set(direction, (directions.get(direction) || 0) + 1);
  });
  const directionItems = [...directions.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const recent = matches.slice(-3).reverse();

  return `
    <section class="section">
      <div class="section-head">
        <div>
          <p>Archive Stats</p>
          <h2>历史预测统计</h2>
        </div>
      </div>
      <div class="stats-grid">
        <div class="stat-card"><span>预测场次</span><strong>${matches.length}</strong></div>
        <div class="stat-card"><span>已完赛</span><strong>${team.stats?.accuracy?.completed || 0}</strong></div>
        <div class="stat-card"><span>亚盘命中率</span><strong>${formatAccuracy(team.stats?.accuracy)}</strong></div>
        <div class="stat-card"><span>正确/错误</span><strong>${team.stats?.accuracy?.correct || 0} / ${team.stats?.accuracy?.wrong || 0}</strong></div>
      </div>
      <div class="trend-list">
        ${directionItems.map(([direction, count]) => `
          <div>
            <span>${escapeHtml(direction)}</span>
            <strong>${count} 次</strong>
          </div>
        `).join("")}
      </div>
      <div class="trend-list compact">
        ${recent.map((match) => `
          <a href="${hashFor("match", match.id)}">
            <span>${escapeHtml(match.teams.join(" vs "))}</span>
            <strong>${escapeHtml(match.direction || "-")}</strong>
          </a>
        `).join("")}
      </div>
    </section>
  `;
}

function renderTeams() {
  app.innerHTML = `
    <section class="section">
      <div class="section-head">
        <div>
          <p>Team Archive</p>
          <h2>球队历史预测</h2>
        </div>
        <span class="badge">${data.teams.length} 支球队</span>
      </div>
      <input id="searchInput" class="search-box" type="search" placeholder="搜索球队名称或小组" />
      <div id="teamList" class="team-grid">
        ${data.teams.map(renderTeamCard).join("")}
      </div>
    </section>
  `;
  bindSearch("teamList", (keyword) => {
    return data.teams.filter((team) => {
      const pool = `${team.name} ${team.groups.join(" ")}`;
      return pool.toLowerCase().includes(keyword.toLowerCase());
    }).map(renderTeamCard).join("");
  });
}

function renderTeam(teamName) {
  const team = teamByName.get(teamName);
  if (!team) {
    renderEmpty("没有找到这支球队的预测记录");
    return;
  }
  const matches = team.matches.map((id) => byId.get(id)).filter(Boolean);
  app.innerHTML = `
    <section class="detail-hero">
      <span class="eyebrow">球队历史</span>
      <h1>${escapeHtml(team.name)}</h1>
      <div class="prediction-strip">
        <div class="metric"><span>预测记录</span><strong>${matches.length} 场</strong></div>
        <div class="metric"><span>所属小组</span><strong>${escapeHtml(team.groups.join(" / "))}</strong></div>
      </div>
    </section>
    ${renderHistoryStats(matches, team)}
    <section class="section">
      <div class="match-list">
        ${matches.map((match) => renderMatchCard(match, { long: true })).join("")}
      </div>
    </section>
  `;
}

function renderMatch(matchId) {
  const match = byId.get(matchId) || data.matches[0];
  if (!match) {
    renderEmpty("还没有比赛数据");
    return;
  }
  const result = match.result || {};
  const pick = result.asianPick ? `${result.asianPick.team} ${result.asianPick.handicap}` : "-";
  app.innerHTML = `
    <section class="detail-hero">
      <div class="meta-row">
        <span>${escapeHtml(metaLabel(match))}</span>
        <span>${renderStatusBadge(match)} ${renderSettlementBadge(match)}</span>
      </div>
      <h1>${escapeHtml(match.teams[0])} vs ${escapeHtml(match.teams[1])}</h1>
      <p class="card-summary">${escapeHtml(match.venue || match.stage || "")}</p>
      <div class="detail-grid">
        <div class="metric"><span>亚盘观点</span><strong>${escapeHtml(pick)}</strong></div>
        <div class="metric"><span>实际赛果</span><strong>${escapeHtml(result.scoreText || "未开始")}</strong></div>
        <div class="metric"><span>结算结果</span><strong>${renderSettlementBadge(match)}</strong></div>
        <div class="metric"><span>预测结论</span><strong>${escapeHtml(match.asianLine || "-")}</strong></div>
      </div>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p>Prediction Report</p>
          <h2>完整专题</h2>
        </div>
      </div>
      <article class="article">${markdownToHtml(match.rawMarkdown)}</article>
    </section>
    <section class="section">
      <div class="section-head">
        <div>
          <p>Related</p>
          <h2>相关球队</h2>
        </div>
      </div>
      <div class="team-grid">
        ${match.teams.map((teamName) => renderTeamCard(teamByName.get(teamName))).join("")}
      </div>
    </section>
  `;
}

function bindSearch(targetId, renderer) {
  const input = document.querySelector("#searchInput");
  const target = document.querySelector(`#${targetId}`);
  input.addEventListener("input", () => {
    const html = renderer(input.value.trim());
    target.innerHTML = html || `<div class="empty">没有匹配结果</div>`;
  });
}

function renderEmpty(message) {
  app.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}

function markdownToHtml(markdown = "") {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const html = [];
  let paragraph = [];
  let list = [];
  let code = [];
  let inCode = false;

  const flushParagraph = () => {
    if (paragraph.length) {
      html.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
      paragraph = [];
    }
  };

  const flushList = () => {
    if (list.length) {
      html.push(`<ul>${list.map((item) => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
      list = [];
    }
  };

  const flushCode = () => {
    if (code.length) {
      html.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
      code = [];
    }
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];

    if (line.trim().startsWith("```")) {
      flushParagraph();
      flushList();
      if (inCode) {
        flushCode();
      }
      inCode = !inCode;
      continue;
    }

    if (inCode) {
      code.push(line);
      continue;
    }

    if (line.trim() === "") {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^\|.+\|$/.test(line.trim()) && lines[index + 1] && /^\|\s*:?-{3,}:?\s*\|/.test(lines[index + 1].trim())) {
      flushParagraph();
      flushList();
      const rows = [];
      while (index < lines.length && /^\|.+\|$/.test(lines[index].trim())) {
        rows.push(lines[index]);
        index += 1;
      }
      index -= 1;
      html.push(tableToHtml(rows));
      continue;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length;
      html.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }

    const listItem = /^-\s+(.+)$/.exec(line);
    if (listItem) {
      flushParagraph();
      list.push(listItem[1]);
      continue;
    }

    const quote = /^>\s*(.+)$/.exec(line);
    if (quote) {
      flushParagraph();
      flushList();
      html.push(`<blockquote>${inlineMarkdown(quote[1])}</blockquote>`);
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  flushList();
  flushCode();
  return html.join("");
}

function tableToHtml(rows) {
  const parseRow = (row) => row.split("|").slice(1, -1).map((cell) => cell.trim());
  const header = parseRow(rows[0]);
  const body = rows.slice(2).map(parseRow);
  return `
    <table>
      <thead><tr>${header.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join("")}</tr></thead>
      <tbody>${body.map((row) => `<tr>${row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join("")}</tr>`).join("")}</tbody>
    </table>
  `;
}

function inlineMarkdown(value = "") {
  return escapeHtml(value)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderRoute() {
  const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean);
  const route = parts[0] || "home";
  const value = parts[1] ? decodeURIComponent(parts[1]) : "";
  updateActiveNav(route);

  if (route === "home") renderHome();
  else if (route === "matches") renderMatches();
  else if (route === "rounds") renderRounds();
  else if (route === "round") renderRound(value);
  else if (route === "teams") renderTeams();
  else if (route === "team") renderTeam(value);
  else if (route === "match") renderMatch(value);
  else renderHome();

  scrollTo({ top: 0, behavior: "auto" });
}

navButtons.forEach((button) => {
  button.addEventListener("click", () => routeTo(button.dataset.nav));
});

shareButton.addEventListener("click", async () => {
  const shareData = {
    title: document.title,
    text: "世界杯比赛预测专题",
    url: location.href
  };
  try {
    if (navigator.share) {
      await navigator.share(shareData);
    } else if (navigator.clipboard) {
      await navigator.clipboard.writeText(location.href);
    }
    shareButton.querySelector("span").textContent = "✓";
  } catch (error) {
    shareButton.querySelector("span").textContent = "!";
  }
  setTimeout(() => {
    shareButton.querySelector("span").textContent = "↗";
  }, 1200);
});

window.addEventListener("hashchange", renderRoute);
renderRoute();
