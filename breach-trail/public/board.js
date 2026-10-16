(function () {
  "use strict";
  var D = {
    en: { tag: "RED TEAM // BREACH TRAIL", title: "Live leaderboard", sub: "Most points, then fastest.", pl: "OPERATORS", dn: "FINISHED", op: "OPERATOR", pts: "POINTS", lv: "SOLVED", st: "STAMPS", tm: "TIME",
      empty: "No operators yet. Be the first to hack the stand.", foot: "Play at the stand", live: "LIVE · REFRESH 5 S", log: "> EVENT LOG", elite: "ELITE",
      ev: { join: ["JOIN", "joined the trail"], solve: ["SOLVE", "solved"], stamp: ["STAMP", "earned the {d} stamp"], finish: ["FINISH", "ACCESS GRANTED"] }, lang: "ع" },
    ar: { tag: "الفريق الأحمر // مسار الاختراق", title: "لوحة الصدارة المباشرة", sub: "الأعلى نقاطاً ثم الأسرع.", pl: "المشغّلون", dn: "أنهوا", op: "المشغّل", pts: "النقاط", lv: "المحلولة", st: "الأختام", tm: "الوقت",
      empty: "لا مشغّلين بعد. كن الأول في اختراق الجناح.", foot: "العب في الجناح", live: "مباشر · تحديث كل 5 ث", log: "> سجل الأحداث", elite: "النخبة",
      ev: { join: ["انضمام", "انضم إلى المسار"], solve: ["حل", "حلّ"], stamp: ["ختم", "نال ختم {d}"], finish: ["إنهاء", "تم منح الوصول"] }, lang: "EN" }
  };
  var TR = { MOTIVATED: ["Δ-01", "Δ-01"], GENIUS: ["Ω-02", "Ω-02"], POSITIVE: ["Σ-03", "Σ-03"] };
  var $ = function (i) { return document.getElementById(i); };
  var last = null, timer = null;
  function t(k) { return D[I18N.lang][k]; }
  function mmss(s) { var m = Math.floor(s / 60), r = s % 60; return ("0" + m).slice(-2) + ":" + (r < 10 ? "0" : "") + r; }
  function el(tag, text, cls) { var c = document.createElement(tag); if (text !== undefined) c.textContent = text; if (cls) c.className = cls; return c; }
  function paint() {
    document.documentElement.lang = I18N.lang;
    $("tag").textContent = t("tag"); $("title").textContent = t("title"); $("sub").textContent = t("sub"); $("lPlayers").textContent = t("pl"); $("lDone").textContent = t("dn");
    $("hOp").textContent = t("op"); $("hPts").textContent = t("pts"); $("hLv").textContent = t("lv"); $("hSt").textContent = t("st"); $("hTime").textContent = t("tm");
    $("empty").textContent = t("empty"); $("lang").textContent = t("lang"); $("live").textContent = t("live"); $("logT").textContent = t("log"); $("liveTag").textContent = "● LIVE";
    var f = $("foot"); f.textContent = t("foot") + " · "; f.appendChild(el("b", "#IHackedITC"));
    if (!last) return;
    $("nPlayers").textContent = last.players; $("nDone").textContent = last.finished;
    var goal = last.goal || 4, body = $("rows"); body.textContent = "";
    last.top.forEach(function (r, i) {
      var tr = el("tr"); if (i < 3) tr.className = "top3";
      var c0 = el("td"); c0.appendChild(el("span", ("0" + (i + 1)).slice(-2), "rank")); tr.appendChild(c0);
      var nm = el("td", r.nickname, "op"); if (r.elite) nm.appendChild(el("span", "★ " + t("elite"), "elite")); tr.appendChild(nm);
      tr.appendChild(el("td", r.points, "pts"));
      var sv = el("td", r.levels + "/" + goal); if (r.levels > goal) sv.appendChild(el("span", "+" + (r.levels - goal), "plus")); tr.appendChild(sv);
      var d = el("td", "", "dots"); for (var k = 0; k < 3; k++) d.appendChild(el("span", k < r.stamps ? "●" : "○", k < r.stamps ? "" : "o")); tr.appendChild(d);
      tr.appendChild(el("td", r.levels >= goal ? mmss(r.seconds) : "—", "time")); body.appendChild(tr);
    });
    $("empty").hidden = last.top.length > 0;
    var log = $("log"); log.textContent = "";
    (last.events || []).forEach(function (e) {
      var d = t("ev")[e.kind]; if (!d) return;
      var row = el("div", "", "ev " + e.kind);
      row.appendChild(el("span", d[0], "k")); row.appendChild(el("span", e.ts, "t"));
      var m = el("div", "", "m"); m.appendChild(el("b", e.nick));
      var tname = TR[e.detail] ? TR[e.detail][I18N.lang === "ar" ? 1 : 0] : e.detail;
      var txt = " " + d[1].replace("{d}", TR[e.detail] ? tname : "") + (e.kind === "solve" ? " " + e.detail : "") + (e.kind === "finish" ? " · " : "");
      m.appendChild(document.createTextNode(txt)); row.appendChild(m); log.appendChild(row);
    });
  }
  function poll() {
    clearTimeout(timer);
    if (document.hidden) { timer = setTimeout(poll, 5000); return; }
    fetch("/api/leaderboard").then(function (r) { return r.json(); }).then(function (d) { last = d; paint(); }).catch(function () {}).then(function () { timer = setTimeout(poll, 5000); });
  }
  $("lang").addEventListener("click", function () { I18N.set(I18N.lang === "ar" ? "en" : "ar"); paint(); });
  I18N.init(); paint(); poll();
})();
