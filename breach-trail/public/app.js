/* ITC // RED TEAM . BREACH TRAIL : player app (vanilla JS, no build step) */
(function () {
  "use strict";

  var T = function (k, p) { return I18N.t(k, p); };
  var $ = function (id) { return document.getElementById(id); };
  var NS = "http://www.w3.org/2000/svg";
  var GAMES = ["1", "2", "3", "5", "6", "7", "9", "10", "4"];
  var CORE = GAMES;
  var HUB_ORDER = ["1", "2", "3", "4", "5", "6", "7", "9", "10"];
  var CORE4 = ["1", "2", "3", "4"];
  var MINS = { "1": 3, "2": 3, "3": 6, "4": 2, "5": 4, "6": 4, "7": 5, "9": 6, "10": 4 };

  var player = null;        // latest state from the server (plus id)
  var ui = { view: null, hints: {}, tab: "elements", expanded: {}, role: null };
  var hintCount = {};
  var opened = {};

  /* ---------------------------------------------------------- helpers */
  function h(tag, attrs) {
    var el = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k];
      if (v === null || v === undefined || v === false) return;
      if (k === "class") el.className = v;
      else if (k === "text") el.textContent = v;
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) add(el, arguments[i]);
    return el;
  }
  function add(el, c) {
    if (c === null || c === undefined || c === false) return;
    if (Array.isArray(c)) c.forEach(function (x) { add(el, x); });
    else el.appendChild(typeof c === "string" || typeof c === "number" ? document.createTextNode(String(c)) : c);
  }
  function s(tag, attrs) {
    var el = document.createElementNS(NS, tag);
    if (attrs) Object.keys(attrs).forEach(function (k) { el.setAttribute(k, attrs[k]); });
    for (var i = 2; i < arguments.length; i++) if (arguments[i]) el.appendChild(arguments[i]);
    return el;
  }
  function store(k, v) { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function fmt(str, p) { return String(str).replace(/\{(\w+)\}/g, function (m, k) { return p && p[k] !== undefined ? p[k] : m; }); }

  function api(path, body) {
    var opts = body === undefined ? {} : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) };
    return fetch(path, opts).then(function (r) {
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).catch(function () { return { status: 0, data: { error: T("err_net") } }; });
  }

  var toastTimer = null;
  function toast(text) {
    var old = document.querySelector(".toast"); if (old) old.remove();
    var el = h("div", { class: "toast", role: "status", text: text });
    document.body.appendChild(el);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.remove(); }, 2600);
  }

  function setMsg(el, text, cls) { el.textContent = text || ""; el.className = "msg" + (cls ? " " + cls : ""); }
  function lvName(n) { return T("g_names")[String(n)]; }
  function solved(l) { return player && player.solved.indexOf(l) !== -1; }
  function unlocked(l) { return player && player.unlocked.indexOf(l) !== -1; }
  function stamped(l) { return player && player.stamped[l]; }

  /* ------------------------------------------------------------ stamps */
  var stampN = 0;
  var TRACKS = ["motivated", "genius", "positive"];
  var TR_GLYPH = { motivated: "\u0394", genius: "\u03A9", positive: "\u03A3" };   // players see codes, never the real track names
  var TR_WORD = { motivated: "VECTOR", genius: "APEX", positive: "POLARITY" };
  var RUNE = { A: "\u16A8", B: "\u16D2", C: "\u16B2", D: "\u16DE", E: "\u16D6", F: "\u16A0", G: "\u16B7", H: "\u16BA", I: "\u16C1", J: "\u16C3", K: "\u16B2", L: "\u16DA", M: "\u16D7", N: "\u16BE", O: "\u16DF", P: "\u16C8", Q: "\u16B2", R: "\u16B1", S: "\u16CA", T: "\u16CF", U: "\u16A2", V: "\u16B9", W: "\u16B9", X: "\u16B2\u16CA", Y: "\u16C3", Z: "\u16CA", " ": "\u16EB", ".": "\u16EB", "-": "\u16EB" };
  function runes(s) { return String(s).toUpperCase().split("").map(function (c) { return RUNE[c] || c; }).join(""); }
  function ic(name, cls) {
    var w = document.createElement("div");
    w.innerHTML = '<svg class="ic ' + (cls || "") + '" aria-hidden="true"><use href="#i-' + name + '"/></svg>';   // static markup, never server data
    return w.firstChild;
  }
  function stampTrack(track, kind, leader) {
    var n = ++stampN;
    var color = kind === "ghost" ? "var(--grey)" : "var(--hot)";
    var wrap = document.createElement("div");
    wrap.innerHTML = '<svg class="stamp ' + kind + '" viewBox="0 0 120 120" role="img" style="color:' + color + '">' +
      '<circle cx="60" cy="60" r="57" fill="none" stroke="currentColor" stroke-width="3"' + (kind === "ready" ? ' stroke-dasharray="6 4"' : "") + '/>' +
      '<circle cx="60" cy="60" r="39" fill="none" stroke="currentColor" stroke-width="1.5"/>' +
      '<path id="st' + n + 't" d="M 16.5 60 A 43.5 43.5 0 0 1 103.5 60" fill="none"/>' +
      '<path id="st' + n + 'b" d="M 8.5 60 A 51.5 51.5 0 0 0 111.5 60" fill="none"/>' +
      '<text font-family="NotoRunic, serif" font-size="10" letter-spacing="1.5" fill="currentColor"><textPath class="tt" href="#st' + n + 't" startOffset="50%" text-anchor="middle"></textPath></text>' +
      '<text font-family="NotoRunic, serif" font-size="11" letter-spacing="3" fill="currentColor"><textPath class="tb" href="#st' + n + 'b" startOffset="50%" text-anchor="middle"></textPath></text>' +
      '<text x="60" y="73" text-anchor="middle" font-family="JetBrains Mono, monospace" font-weight="800" font-size="34" fill="currentColor">' + TR_GLYPH[track] + '</text></svg>';
    var svg = wrap.firstChild;
    svg.querySelector(".tt").textContent = runes(leader || "ITC BREACH TRAIL");
    svg.querySelector(".tb").textContent = runes(TR_WORD[track]);
    svg.setAttribute("aria-label", T("tr_names")[track]);
    return svg;
  }
  function rankIdx() {
    var n = Math.min(GAMES.filter(solved).length, 4);
    if (n >= 4 && solved("b1") && solved("b2")) n = 5;
    return n;
  }
  function rankChip() {
    var i = rankIdx();
    return h("span", { class: "pill red" }, ic("bolt"), h("span", { class: "ltr", text: T("rank_chip", { n: i, name: T("rank_names")[i] }) }));
  }
  function readyCount() { return player && player.tracks ? TRACKS.filter(function (t) { return player.tracks[t].ready; }).length : 0; }
  function stampedCount() { return player && player.tracks ? TRACKS.filter(function (t) { return player.tracks[t].stamp; }).length : 0; }
  function solvedCount() { return GAMES.filter(solved).length; }
  function coreCount() { return CORE4.filter(solved).length; }
  function stageNo() { return player && player.stage !== undefined ? player.stage : 0; }

  /* ----------------------------------------------------------- header */
  function renderHeader() {
    var lb = $("langBtn"); lb.setAttribute("aria-label", "Language"); lb.title = T("lang_other");
    var idb = $("idBtn");
    idb.hidden = !player; idb.setAttribute("aria-label", T("my_id"));
    idb.className = "ibtn" + (readyCount() > 0 ? " hot" : "");
    var box = $("pips"); box.textContent = "";
    if (player) {
      var done = player.finished;
      var chip = h("button", { class: "pill" + (done ? " ok" : " red"), type: "button", "aria-label": T("tab_pass"), onclick: function () { ui.view = "passport"; render(); } },
        done ? ic("check") : null, h("span", { class: "ltr", text: coreCount() + "/4" }));
      box.appendChild(chip);
    }
    box.hidden = !player;
  }

  function renderTabs(view) {
    var nav = $("tabs"); nav.textContent = "";
    var show = !!player && /^(hub|passport|done|land)$/.test(view);
    nav.hidden = !show; document.body.classList.toggle("hastabs", show);
    if (!show) return;
    [["hub", "prompt", "tab_games"], ["passport", "stamp", "tab_pass"]].forEach(function (t) {
      var on = t[0] === "hub" ? (view === "hub" || view === "done") : (view === "passport" || view === "land");
      var b = h("button", { type: "button", class: on ? "on" : "", "aria-current": on ? "page" : null, onclick: function () { ui.landing = null; ui.view = t[0]; render(); } }, ic(t[1]), h("span", { text: T(t[2]) }));
      nav.appendChild(b);
    });
  }

  /* ------------------------------------------------------------ routing */
  function currentView() {
    if (!player) return "welcome";
    if (!load("bt_onb")) return "onb";
    if (player.finished && !load("bt_done_" + player.id)) return "done";
    if (stageNo() === 2) return "passport";
    return "hub";
  }

  function applyState(d, keepView) {
    var id = player ? player.id : d.id;
    var beforeRank = player ? rankIdx() : null, oldTr = player && player.tracks;
    player = d; player.id = id;
    store("bt_id", id);
    if (!keepView) ui.view = null;
    if (oldTr && d.tracks) {
      TRACKS.forEach(function (t) {
        if (!oldTr[t].stamp && d.tracks[t].stamp) {
          ui.landing = t;
          try { if (navigator.vibrate) navigator.vibrate([80, 30, 40]); } catch (e) {}
        }
      });
    }
    render();
    if (beforeRank !== null && rankIdx() > beforeRank) {
      var r = rankIdx();
      setTimeout(function () { toast(T("rank_up", { n: r, name: T("rank_names")[r] })); }, 1900);
    }
  }

  function render() {
    var view = ui.landing ? "land" : (ui.view || currentView());
    var app = $("app"); app.textContent = "";
    renderHeader();
    if (player && /^l\d+$/.test(view) && !solved(view.slice(1)) && !opened[view.slice(1)]) {
      opened[view.slice(1)] = 1; api("/api/open", { id: player.id, level: view.slice(1) });
    }
    if (player && /^(bonus|b1|b2)$/.test(view) && !player.finished) view = "hub";
    if (player && /^l\d+$/.test(view) && !unlocked(view.slice(1))) view = "hub";
    renderTabs(view);
    var fn = { welcome: vWelcome, onb: vOnb, hub: vHub, land: vLand, l1: vL1, l2: vL2, l3: vL3, l4: vL4, l5: vL5, l6: vL6, l7: vL7, l9: vL9, l10: vL10, passport: vPassport, done: vDone, bonus: vBonus, b1: vB1, b2: vB2, loading: vLoading, error: vError }[view] || vWelcome;
    var node = fn();
    app.appendChild(node);
    if (view === "land") { document.body.classList.add("impact"); setTimeout(function () { document.body.classList.remove("impact"); }, 300); }
    window.scrollTo(0, 0);
  }

  /* -------------------------------------------------------------- hints */
  function hintBlock(level) {
    var box = h("div");
    var btn = h("button", { class: "ghost", type: "button", text: T("hint_btn") });
    btn.addEventListener("click", function () {
      api("/api/hint", { id: player.id, level: level }).then(function (r) {
        if (r.status !== 200) return;
        var list = T((/^\d/.test(level) ? "l" : "") + level + "_hints");
        var n = r.data.n, idx = Math.min(n, list.length) - 1;
        var p = {}; Object.keys(r.data.params || {}).forEach(function (k) { p[k] = r.data.params[k]; });
        if (p.tab) p.tab = T("l3_tab_" + p.tab);
        if (p.steps) p.steps = p.steps.map(function (x) { return T("tools")[x]; }).join(" > ");
        box.appendChild(h("div", { class: "hint", text: T("hint_n", { n: idx + 1, m: list.length, text: fmt(list[idx], p) }) }));
        if (n >= list.length) btn.disabled = true;
      });
    });
    return { button: btn, box: box };
  }

  function levelHead(n, title) { return gameTop(n, title); }
  function gameTop(n, title) {
    var back = h("button", { class: "ibtn", type: "button", "aria-label": T("back_hub"), onclick: function () { ui.view = "hub"; render(); } }, ic("back"));
    return h("div", { class: "gtop" }, back,
      h("div", { class: "gt" }, h("small", { class: "ltr", text: T("game_label", { n: ("0" + n).slice(-2), m: MINS[n] || 3 }) }), h("b", { text: title })));
  }

  function answerBox(opts) {
    var input = h("input", { type: "text", autocomplete: "off", autocapitalize: opts.caps ? "characters" : "off", autocorrect: "off", spellcheck: "false", placeholder: opts.ph, enterkeyhint: "go", class: opts.ltr ? "ltr" : null });
    var msg = h("div", { class: "msg", role: "status" });
    var go = h("button", { type: "button", text: opts.btn });
    var hb = opts.level ? hintBlock(opts.level) : null;
    function submit() {
      go.disabled = true;
      opts.submit(input.value, msg).then(function () { go.disabled = false; });
    }
    go.addEventListener("click", submit);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") submit(); });
    return h("div", null,
      h("label", { class: "f" }, opts.label, input),
      h("div", { class: "row" }, go, hb && hb.button),
      msg, hb && hb.box);
  }

  function submitAnswer(level, value, msg, wrongKey) {
    return api("/api/answer", { id: player.id, level: level, answer: value }).then(function (r) {
      if (r.status !== 200) return setMsg(msg, r.data.error || T("err_generic"), "bad");
      if (r.data.correct) {
        var wasCore = GAMES.indexOf(level) !== -1;
        applyState(r.data, !wasCore);
        toast(wasCore ? lvName(level) + " ✓" : T("solved_ok"));
        if (!wasCore) ui.view = "bonus", render();
      } else setMsg(msg, T(wrongKey), "bad");
    });
  }

  function solvedNote(level) {
    return h("div", null,
      h("div", { class: "card" }, h("b", { text: "✓ " }), T("solved_ok")),
      h("div", { class: "row" }, h("button", { type: "button", text: T("back_hub"), onclick: function () { ui.view = "hub"; render(); } })));
  }

  /* -------------------------------------------------------------- welcome */
  function vWelcome() {
    var input = h("input", { type: "text", maxlength: "20", autocomplete: "off", placeholder: T("w_name_ph"), enterkeyhint: "go", class: "ltr", id: "nick" });
    var msg = h("div", { class: "msg", role: "status" });
    var go = h("button", { type: "button", text: T("w_start") });
    function start() {
      var nick = input.value.trim();
      if (nick.length < 2) return setMsg(msg, T("w_err_name"), "bad");
      go.disabled = true;
      api("/api/join", { nickname: nick }).then(function (r) {
        go.disabled = false;
        if (r.status !== 200) return setMsg(msg, r.data.error || T("err_generic"), "bad");
        applyState(r.data);
      });
    }
    go.addEventListener("click", start);
    input.addEventListener("keydown", function (e) { if (e.key === "Enter") start(); });
    return h("section", null,
      h("h1", { text: T("w_title") }),
      h("p", { class: "lead", text: T("w_lead") }),
      h("div", { class: "card" },
        h("label", { class: "f", style: "margin-top:0" }, T("w_name_label"), input),
        h("div", { class: "row" }, go), msg),
      h("p", { class: "foot", text: T("w_note") }));
  }

  /* ---------------------------------------------- level 1: caesar wheel */
  function decodeText(text, k) {
    return text.replace(/[A-Z]/g, function (c) { return String.fromCharCode((c.charCodeAt(0) - 65 - k + 26) % 26 + 65); });
  }

  function buildWheel(cipher, onK) {
    var STEP = 360 / 26, C = 150, k = 0;
    var svg = s("svg", { viewBox: "0 0 300 300", class: "wheel", role: "img", "aria-label": "Cipher wheel" });
    svg.appendChild(s("circle", { cx: C, cy: C, r: 146, fill: "#0e0f12", stroke: "#2e323a", "stroke-width": 2 }));
    svg.appendChild(s("circle", { cx: C, cy: C, r: 110, fill: "none", stroke: "#2e323a", "stroke-width": 1.5 }));
    var i, t;
    for (i = 0; i < 26; i++) {
      t = s("text", { x: C, y: C - 124, "text-anchor": "middle", "font-size": 17, fill: "#f2f3f5", transform: "rotate(" + (i * STEP) + " " + C + " " + C + ")" });
      t.textContent = String.fromCharCode(65 + i);
      svg.appendChild(t);
    }
    var inner = s("g", { transform: "rotate(0 " + C + " " + C + ")" });
    inner.appendChild(s("circle", { cx: C, cy: C, r: 104, fill: "#2a1214", stroke: "#ff4d52", "stroke-width": 2 }));
    inner.appendChild(s("circle", { cx: C, cy: C - 86, r: 13, fill: "#ff4d52" }));
    for (i = 0; i < 26; i++) {
      t = s("text", { x: C, y: C - 80, "text-anchor": "middle", "font-size": 16, fill: i === 0 ? "#0e0f12" : "#f2f3f5", transform: "rotate(" + (i * STEP) + " " + C + " " + C + ")" });
      t.textContent = String.fromCharCode(65 + i);
      inner.appendChild(t);
    }
    svg.appendChild(inner);
    svg.appendChild(s("path", { d: "M150 4 L141 -8 L159 -8 Z", transform: "translate(0 14)", fill: "#ff4d52" }));
    var center = s("text", { x: C, y: C + 8, "text-anchor": "middle", "font-size": 30, fill: "#ff4d52" });
    center.textContent = "0";
    svg.appendChild(center);

    function setK(v) {
      k = ((v % 26) + 26) % 26;
      inner.setAttribute("transform", "rotate(" + (k * STEP) + " " + C + " " + C + ")");
      center.textContent = String(k);
      onK(k);
    }

    var dragging = false, last = 0, acc = 0;
    function ang(e) {
      var r = svg.getBoundingClientRect();
      return Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180 / Math.PI;
    }
    svg.addEventListener("pointerdown", function (e) {
      dragging = true; last = ang(e); acc = k * STEP;
      try { svg.setPointerCapture(e.pointerId); } catch (x) {}
      e.preventDefault();
    });
    svg.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      var a = ang(e), d = a - last;
      if (d > 180) d -= 360; if (d < -180) d += 360;
      last = a; acc += d;
      var nk = Math.round(acc / STEP);
      if (((nk % 26) + 26) % 26 !== k) setK(nk);
    });
    function end() { dragging = false; }
    svg.addEventListener("pointerup", end);
    svg.addEventListener("pointercancel", end);
    return { el: svg, setK: setK, get k() { return k; } };
  }

  function vL1() {
    if (solved("1")) return h("section", null, levelHead(1, lvName(1)), solvedNote());
    var cipher = player.challenges["1"].cipher;
    var out = h("div", { class: "out", "aria-live": "polite" });
    var slider = h("input", { type: "range", min: "0", max: "25", value: "0", "aria-label": T("l1_steps") });
    var steps = h("span", { text: "0" });
    var wheel = buildWheel(cipher, function (k) {
      slider.value = k; steps.textContent = k; out.textContent = decodeText(cipher, k);
    });
    slider.addEventListener("input", function () { wheel.setK(parseInt(slider.value, 10)); });
    out.textContent = decodeText(cipher, 0);
    var ans = answerBox({
      level: "1", label: T("l1_answer_label"), ph: T("l1_ph"), btn: T("l1_btn"), caps: true, ltr: true,
      submit: function (v, msg) { return submitAnswer("1", v, msg, "l1_wrong"); }
    });
    return h("section", null,
      levelHead(1, lvName(1)),
      h("p", { class: "lead", text: T("l1_lead") }),
      h("div", { class: "card" }, h("div", { class: "label", text: T("l1_intercepted") }), h("div", { class: "cipher", text: cipher })),
      h("div", { class: "card" },
        h("div", { class: "wheelbox" }, wheel.el),
        h("p", { class: "foot", style: "text-align:center;margin:6px 0", text: T("l1_wheel_help") }),
        h("label", { class: "f" }, T("l1_steps") + ": ", steps, slider),
        h("div", { class: "label", text: T("l1_decoded") }), out),
      ans);
  }

  /* ------------------------------------------- level 2: swipe simulator */
  function vL2() {
    if (solved("2")) return h("section", null, levelHead(2, lvName(2)), solvedNote());
    var cards = player.challenges["2"].cards, n = cards.length;
    var picks = [], root = h("section");
    function draw() {
      root.textContent = "";
      add(root, levelHead(2, lvName(2)));
      add(root, h("p", { class: "lead", text: T("l2_lead") }));
      if (picks.length >= n) return submitPicks();
      var stack = h("div", { class: "stackwrap" });
      if (picks.length + 1 < n) stack.appendChild(h("div", { class: "swcard under", "aria-hidden": "true" }));
      var card = buildCard(cards[picks.length]);
      stack.appendChild(card.el);
      add(root, h("div", { class: "swprog", text: T("l2_progress", { i: picks.length + 1, n: n }) }));
      add(root, stack);
      var fakeBtn = h("button", { class: "fake", type: "button", text: "◀ " + T("l2_swipe_fake") });
      var realBtn = h("button", { class: "real", type: "button", text: T("l2_swipe_real") + " ▶" });
      fakeBtn.addEventListener("click", function () { card.fling(-1); });
      realBtn.addEventListener("click", function () { card.fling(1); });
      add(root, h("div", { class: "swbtns" }, fakeBtn, realBtn));
      var row = h("div", { class: "row" });
      if (picks.length) row.appendChild(h("button", { class: "ghost", type: "button", text: T("l2_undo"), onclick: function () { picks.pop(); draw(); } }));
      var hb = hintBlock("2"); row.appendChild(hb.button);
      add(root, row); add(root, hb.box);
      card.onDecide = function (dir) { picks.push(dir < 0); draw(); };
    }

    function buildCard(c) {
      var lang = I18N.lang;
      var stampFake = h("div", { class: "stampmark fake", text: T("l2_swipe_fake") });
      var stampReal = h("div", { class: "stampmark real", text: T("l2_swipe_real") });
      var det = h("dl", { class: "hdrs", hidden: true },
        h("dt", { text: T("l2_from") }), h("dd", { text: c.sender_name }),
        h("dt", { text: T("l2_addr") }), h("dd", { text: c.addr }),
        c.reply_to ? [h("dt", { text: T("l2_reply") }), h("dd", { text: c.reply_to })] : null,
        c.subject ? [h("dt", { text: T("l2_subject") }), h("dd", { text: c.subject })] : null,
        c.link_target ? [h("dt", { text: T("l2_link") }), h("dd", { text: c.link_target })] : null);
      var tg = h("button", { class: "ghost", type: "button", style: "min-height:40px;padding:6px 12px;font-size:13px", text: T("l2_details") });
      tg.addEventListener("click", function () { det.hidden = !det.hidden; tg.textContent = det.hidden ? T("l2_details") : T("l2_hide"); });
      tg.addEventListener("pointerdown", function (e) { e.stopPropagation(); });
      var el = h("div", { class: "swcard", dir: lang === "ar" ? "rtl" : "ltr" },
        stampFake, stampReal,
        h("div", { class: "chan", text: T("l2_ch")[c.channel] || "" }),
        h("div", { class: "who", text: c.sender_name }),
        c.subject ? h("div", { class: "subj", text: c.subject }) : null,
        h("div", { class: "bodytxt", text: c.body[lang] || c.body.en }),
        tg, det);
      var obj = { el: el, onDecide: null };
      var sx = 0, dx = 0, drag = false;
      function visual(x) {
        el.style.transform = "translateX(" + x + "px) rotate(" + (x / 18) + "deg)";
        stampFake.style.opacity = x < 0 ? Math.min(1, -x / 90) : 0;
        stampReal.style.opacity = x > 0 ? Math.min(1, x / 90) : 0;
      }
      el.addEventListener("pointerdown", function (e) {
        if (e.target.closest("button")) return;
        drag = true; sx = e.clientX; dx = 0;
        try { el.setPointerCapture(e.pointerId); } catch (x) {}
      });
      el.addEventListener("pointermove", function (e) {
        if (!drag) return;
        dx = e.clientX - sx; visual(dx);
      });
      function release() {
        if (!drag) return; drag = false;
        if (Math.abs(dx) > 90) obj.fling(dx < 0 ? -1 : 1); else { el.style.transition = "transform .2s"; visual(0); setTimeout(function () { el.style.transition = ""; }, 220); }
      }
      el.addEventListener("pointerup", release);
      el.addEventListener("pointercancel", release);
      obj.fling = function (dir) {
        el.style.transition = "transform .25s, opacity .25s";
        visual(dir * 420); el.style.opacity = "0";
        setTimeout(function () { if (obj.onDecide) obj.onDecide(dir); }, 220);
      };
      return obj;
    }

    function submitPicks() {
      var msg = h("div", { class: "msg", role: "status", text: T("loading") });
      add(root, msg);
      api("/api/phish", { id: player.id, picks: picks }).then(function (r) {
        root.textContent = "";
        add(root, levelHead(2, lvName(2)));
        if (r.status !== 200) {
          add(root, h("div", { class: "msg bad", text: r.data.error || T("err_generic") }));
          return add(root, h("div", { class: "row" }, h("button", { type: "button", text: T("l2_retry"), onclick: function () { picks = []; draw(); } })));
        }
        var d = r.data;
        if (!d.pass) {
          var list = d.wrong.map(function (i) { return i + 1; }).join(", ");
          add(root, h("div", { class: "card" }, h("div", { class: "msg bad", text: T("l2_fail", { s: d.score, t: d.total, list: list }) })));
          return add(root, h("div", { class: "row" }, h("button", { type: "button", text: T("l2_retry"), onclick: function () { picks = []; draw(); } })));
        }
        add(root, h("p", { class: "lead", text: T("l2_pass", { s: d.score, t: d.total }) }));
        var rev = h("div", { class: "review" });
        d.review.forEach(function (it, i) {
          var c = cards.filter(function (x) { return x.id === it.id; })[0];
          var why = it.why[I18N.lang] || it.why.en;
          rev.appendChild(h("div", { class: "it", dir: I18N.lang === "ar" ? "rtl" : "ltr" },
            h("div", { class: "verdict " + (it.fake ? "fake" : "real"), text: (i + 1) + ". " + (it.fake ? T("l2_was_fake") : T("l2_was_real")) + " — " + c.sender_name }),
            h("ul", null, why.map(function (w) { return h("li", { text: w }); }))));
        });
        add(root, rev);
        add(root, h("div", { class: "row" }, h("button", { type: "button", text: T("l2_continue"), onclick: function () { applyState(d); toast(lvName(2) + " ✓"); } })));
      });
    }
    draw();
    return root;
  }

  /* ------------------------------------- level 3: embedded dev tools */
  function nodeEl(node, path, depth) {
    var wrap = h("div", { class: "node" });
    if (node.comment !== undefined) {
      wrap.appendChild(h("span", { class: "cm", text: "<!--" + node.comment + "-->" }));
      return wrap;
    }
    var attrs = node.attrs ? Object.keys(node.attrs).map(function (k) { return " " + k + '="' + node.attrs[k] + '"'; }).join("") : "";
    var open = "<" + node.tag + attrs + ">";
    var kids = node.children || [];
    if (!kids.length) {
      wrap.appendChild(h("span", { class: "tg", text: open }));
      if (node.text) { wrap.appendChild(h("span", { class: "tx", text: node.text })); wrap.appendChild(h("span", { class: "tg", text: "</" + node.tag + ">" })); }
      return wrap;
    }
    var isOpen = ui.expanded[path] === undefined ? true : ui.expanded[path];
    var tgl = h("button", { class: "tgl", type: "button", "aria-expanded": isOpen ? "true" : "false", "aria-label": node.tag, text: isOpen ? "▼" : "▶" });
    var box = h("div", { class: "kids", hidden: !isOpen });
    tgl.addEventListener("click", function () {
      isOpen = !isOpen; ui.expanded[path] = isOpen;
      box.hidden = !isOpen; tgl.textContent = isOpen ? "▼" : "▶"; tgl.setAttribute("aria-expanded", String(isOpen));
      if (isOpen && !box.childNodes.length) fill();
    });
    function fill() { kids.forEach(function (k, i) { box.appendChild(nodeEl(k, path + "." + i, depth + 1)); }); }
    if (isOpen) fill();
    wrap.appendChild(tgl);
    wrap.appendChild(h("span", { class: "tg", text: open }));
    wrap.appendChild(box);
    wrap.appendChild(h("span", { class: "tg", text: "</" + node.tag + ">" }));
    return wrap;
  }

  function vL3() {
    if (solved("3")) return h("section", null, levelHead(3, lvName(3)), solvedNote());
    var data = player.challenges["3"];
    var pane = h("div", { class: "devpane", role: "tabpanel" });
    var tabs = h("div", { class: "devtabs", role: "tablist" });
    var names = ["elements", "console", "network"];
    function showTab() {
      pane.textContent = "";
      [].forEach.call(tabs.children, function (b) { b.setAttribute("aria-selected", String(b.dataset.tab === ui.tab)); });
      if (ui.tab === "elements") {
        pane.appendChild(h("div", { class: "foot", style: "margin:0 0 6px", text: T("l3_tree_help") }));
        pane.appendChild(nodeEl(data.tree, "r", 0));
      } else if (ui.tab === "console") {
        data.console.forEach(function (l) { pane.appendChild(h("div", { class: "clog " + l.level, text: "> " + l.text })); });
      } else {
        pane.appendChild(h("div", { class: "foot", style: "margin:0 0 6px", text: T("l3_net_help") }));
        data.network.forEach(function (rq) {
          var det = h("div", { class: "reqdet", hidden: true },
            h("div", null, h("b", { text: T("l3_headers") })),
            Object.keys(rq.headers).map(function (k) { return h("div", { text: k + ": " + rq.headers[k] }); }),
            h("div", { style: "margin-top:6px" }, h("b", { text: T("l3_response") })),
            h("div", { text: rq.body }));
          var b = h("button", { class: "req", type: "button" },
            h("span", { class: "m", text: rq.method }), h("span", { class: "s" + (rq.status >= 400 ? " bad" : ""), text: String(rq.status) }), h("span", { text: rq.url }));
          b.addEventListener("click", function () { det.hidden = !det.hidden; });
          pane.appendChild(b); pane.appendChild(det);
        });
      }
    }
    names.forEach(function (nm) {
      var b = h("button", { type: "button", role: "tab", "data-tab": nm, text: T("l3_tab_" + nm) });
      b.addEventListener("click", function () { ui.tab = nm; showTab(); });
      tabs.appendChild(b);
    });
    showTab();
    var page = h("div", { class: "vault" },
      h("h3", { text: T("l3_login_title") }), h("p", { text: T("l3_login_sub") }),
      h("span", { class: "fake-in", text: T("l3_user") }), h("span", { class: "fake-in", text: "••••••" }),
      h("span", { class: "fake-btn", text: T("l3_enter") }));
    var ans = answerBox({
      level: "3", label: T("l3_answer_label"), ph: T("l3_ph"), btn: T("l3_btn"), ltr: true,
      submit: function (v, msg) { return submitAnswer("3", v, msg, "l3_wrong"); }
    });
    return h("section", null,
      levelHead(3, lvName(3)),
      h("p", { class: "lead", text: T("l3_lead") }),
      h("div", { class: "browser" },
        h("div", { class: "urlbar" }, h("i"), h("span", { text: "itc-vault.local" })),
        page, tabs, pane),
      ans);
  }

  /* ------------------------------------------------------ level 4: join */
  function vL4() {
    if (solved("4")) return h("section", null, levelHead(4, lvName(4)), solvedNote());
    var f = {
      name: h("input", { type: "text", id: "f-name", maxlength: "60", autocomplete: "name" }),
      year: h("select", { id: "f-year" }),
      field: h("input", { type: "text", id: "f-field", maxlength: "60" }),
      learn: h("input", { type: "text", id: "f-learn", maxlength: "120" }),
      contact: h("input", { type: "text", id: "f-contact", maxlength: "80", class: "ltr", autocapitalize: "off" }),
      consent: h("input", { type: "checkbox", id: "f-consent" })
    };
    f.year.appendChild(h("option", { value: "", text: T("l4_choose") }));
    Object.keys(T("years")).forEach(function (k) { f.year.appendChild(h("option", { value: k, text: T("years")[k] })); });
    var roles = h("div", { class: "roles", role: "radiogroup" });
    Object.keys(T("roles")).forEach(function (k) {
      var r = h("input", { type: "radio", name: "role", value: k });
      roles.appendChild(h("label", null, r, h("span", null, h("b", { text: T("roles")[k][0] }), h("small", { text: T("roles")[k][1] }))));
    });
    var msg = h("div", { class: "msg", role: "status" });
    var go = h("button", { type: "submit", text: T("l4_submit") });
    var form = h("form", { autocomplete: "off", novalidate: true },
      h("label", { class: "f", for: "f-name", text: T("l4_name") }), f.name,
      h("label", { class: "f", for: "f-year", text: T("l4_year") }), f.year,
      h("label", { class: "f", for: "f-field", text: T("l4_field") }), f.field,
      h("div", { class: "label", style: "margin-top:16px", text: T("l4_role") }), roles,
      h("label", { class: "f", for: "f-learn", text: T("l4_learn") }), f.learn,
      h("label", { class: "f", for: "f-contact", text: T("l4_contact") }), f.contact,
      h("label", { class: "check" }, f.consent, h("span", { text: T("l4_consent") })),
      h("div", { class: "row" }, go), msg);
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var role = form.querySelector('input[name="role"]:checked');
      if (f.name.value.trim().length < 2 || !f.year.value || !role || f.contact.value.trim().length < 3 || !f.consent.checked) return setMsg(msg, T("l4_need"), "bad");
      go.disabled = true;
      api("/api/signup", { id: player.id, name: f.name.value, year: f.year.value, field: f.field.value, role: role.value, learn: f.learn.value, contact: f.contact.value, consent: f.consent.checked }).then(function (r) {
        go.disabled = false;
        if (r.status !== 200) return setMsg(msg, r.data.error || T("err_generic"), "bad");
        ui.role = role.value; store("bt_role", role.value);
        applyState(r.data);
      });
    });
    return h("section", null, levelHead(4, lvName(4)), h("p", { class: "lead", text: T("l4_lead") }), form);
  }

  /* ------------------------------------------------- passport + stamps */
  function vPassport() {
    var tr = player.tracks, got = stampedCount(), ready = readyCount();
    var cols = h("div", { class: "trk" });
    TRACKS.forEach(function (t) {
      var st = tr[t].stamp ? "inked" : tr[t].ready ? "ready" : "ghost";
      var pillTxt = tr[t].stamp ? T("pp_stamped") : tr[t].ready ? T("pp_ready") : T("pp_open");
      cols.appendChild(h("div", { class: "tcol " + st },
        stampTrack(t, st, tr[t].stamp ? tr[t].stamp.leader : null),
        h("b", { class: "ltr", text: T("tr_names")[t] }),
        h("span", { class: "pill sm " + (tr[t].stamp ? "ok" : tr[t].ready ? "red" : ""), text: pillTxt }),
        h("small", { text: T("tr_list")[t] })));
    });
    var empty = got === 0 && ready === 0;
    return h("section", null,
      h("div", { class: "prow" }, h("h1", { class: "ttl", text: T("tab_pass") }), h("span", { class: "pill" }, ic("finger"), h("span", { class: "ltr", text: player.nickname }))),
      h("div", { class: "stat3" },
        h("div", null, h("span", { text: T("pp_stamps") }), h("b", { class: "ltr", text: got + " /3" })),
        h("div", { class: ready ? "hot" : "" }, h("span", { text: T("pp_ready_n") }), h("b", { text: String(ready) })),
        h("div", null, h("span", { text: T("pp_points") }), h("b", { text: String(player.points) }))),
      stageNo() === 2 ? h("div", { class: "card glow" }, h("div", { class: "gh" }, ic("stamp"), h("b", { class: "ltr", text: T("hub_s2_t") })), h("p", { text: T("hub_s2_p") })) : null,
      empty ? h("div", { class: "empty" }, h("b", { text: T("pp_empty_title") }), h("p", { text: T("pp_empty_text") })) : null,
      cols,
      h("div", { class: "trhint ltr" }, h("small", { text: T("tr_hint") })),
      ready ? h("div", { class: "card glow" }, h("p", { class: "lead", text: T("pp_ready_text", { n: ready }) }),
        h("div", { class: "row" }, h("button", { type: "button", onclick: showId }, ic("qr"), " " + T("pp_show_qr")))) : null,
      empty ? h("div", { class: "row" }, h("button", { type: "button", onclick: function () { ui.view = "hub"; render(); } }, ic("prompt"), " " + T("pp_play"))) : null);
  }

  /* ---------------------------------------------------------------- hub */
  function vHub() {
    var st = stageNo(), list = h("div", { class: "hub" });
    HUB_ORDER.forEach(function (g) {
      var ok = solved(g), open = unlocked(g);
      var card = h("button", { class: "gcard" + (ok ? " ok" : "") + (open ? "" : " locked"), type: "button", "aria-disabled": open ? null : "true" },
        h("div", { class: "gno ltr" }, ok ? ic("check") : open ? ("0" + g).slice(-2) : ic("lock")),
        h("div", { class: "gbody" },
          h("b", { text: lvName(g) }),
          h("span", { text: open ? T("g_blurb")[g] : T(g === "4" || CORE4.indexOf(g) >= 0 ? "lock_core" : "lock_stamps") }),
          h("small", { class: "ltr", text: T("g_time", { m: MINS[g] }) })),
        h("div", { class: "gcta" + (ok ? " ok" : open ? "" : " off") }, ok ? [ic("check"), T("hub_again")] : open ? T("hub_play") : T("hub_locked")));
      card.addEventListener("click", function () {
        if (!open) return toast(T(CORE4.indexOf(g) >= 0 ? "lock_core" : "lock_stamps"));
        ui.view = "l" + g; render();
      });
      list.appendChild(card);
    });
    var total = st >= 3 ? 9 : 4, have = st >= 3 ? solvedCount() : coreCount();
    var seg = h("div", { class: "seg", role: "progressbar", "aria-valuemin": "0", "aria-valuemax": String(total), "aria-valuenow": String(have) });
    for (var i = 0; i < total; i++) seg.appendChild(h("i", { class: i < have ? "on" : "" }));
    var step = h("div", { class: "card glow goal" },
      h("div", { class: "gh" }, ic(st === 2 ? "stamp" : st === 3 ? "star" : "prompt"), h("b", { class: "ltr", text: T("hub_s" + st + "_t") })),
      h("p", { text: T("hub_s" + st + "_p") }),
      st === 2 ? h("div", { class: "row" }, h("button", { type: "button", onclick: function () { ui.view = "passport"; render(); } }, ic("stamp"), " " + T("tab_pass"))) : null,
      st === 3 ? h("div", { class: "row" }, h("button", { type: "button", onclick: function () { ui.view = "bonus"; render(); } }, ic("star"), " " + T("hub_bonus"))) : null);
    return h("section", null,
      h("div", { class: "pills" }, rankChip(), h("span", { class: "pill ltr", text: player.points + " PTS" })),
      step,
      h("div", { class: "prog" }, h("span", { class: "label", text: T("hub_title") }), h("span", { class: "ltr", text: have + " / " + total })), seg,
      list);
  }

  function showId() {
    var m = $("modal"); m.textContent = ""; m.hidden = false;
    var qrBox = h("div", { class: "qrbox" });
    try {
      var qr = qrcode(0, "M"); qr.addData("ITC-BT:" + player.code); qr.make();
      qrBox.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 0, scalable: true });   // generated by the bundled QR library from the operator code
      var sv = qrBox.querySelector("svg"); if (sv) { sv.setAttribute("role", "img"); sv.setAttribute("aria-label", "QR " + player.code); }
    } catch (e) { qrBox.textContent = player.code; }
    var close = h("button", { class: "ibtn", type: "button", "aria-label": T("close") }, ic("x"));
    close.addEventListener("click", function () { m.hidden = true; });
    m.onclick = function (e) { if (e.target === m) m.hidden = true; };
    var pills = h("div", { class: "pills" });
    TRACKS.forEach(function (t) { if (player.tracks[t].ready) pills.appendChild(h("span", { class: "pill sm red" }, ic("stamp"), h("span", { class: "ltr", text: T("qr_ready", { t: T("tr_names")[t] }) }))); });
    m.appendChild(h("div", { class: "box glow", role: "dialog", "aria-modal": "true" },
      h("div", { class: "mh" }, h("b", { class: "ltr", text: T("qr_title") }), close),
      h("div", { class: "pills" }, h("span", { class: "pill" }, ic("finger"), h("span", { class: "ltr", text: player.nickname })), rankChip()),
      qrBox, h("div", { class: "label ctr", text: T("qr_op") }), h("div", { class: "bigcode", text: player.code }),
      pills,
      h("div", { class: "waitbar" }, ic("prompt"), h("span", { text: T("qr_wait") })),
      h("p", { class: "foot ctr", text: T("qr_help") })));
    close.focus();
  }

  /* ----------------------------------------------- live stamp landing */
  function vLand() {
    var t = ui.landing, info = player.tracks[t].stamp;
    var seg = h("div", { class: "seg" });
    TRACKS.forEach(function (x) { seg.appendChild(h("i", { class: player.tracks[x].stamp ? "on" : "" })); });
    return h("section", { class: "land" },
      h("div", { class: "banner" }, ic("stamp"), h("span", { class: "ltr", text: T("land_top") })),
      h("div", { class: "bigstamp" }, stampTrack(t, "inked pop", info ? info.leader : null)),
      h("div", { class: "lt ltr", text: T("land_by") }),
      h("div", { class: "lt2 ltr", text: T("tr_names")[t] }),
      h("div", { class: "pills ctr" }, h("span", { class: "pill sm" }, h("span", { class: "ltr", text: T("land_stamps", { n: stampedCount() }) }))),
      seg,
      h("div", { class: "row" }, h("button", { class: "ghost", type: "button", text: T("land_back"), onclick: function () { ui.landing = null; ui.view = (player.finished && !load("bt_done_" + player.id)) ? "done" : "passport"; render(); } })));
  }

  /* ----------------------------------------------------- onboarding */
  function vOnb() {
    var i = ui.onb || 0, steps = T("onb"), s0 = steps[i];
    function finish() { store("bt_onb", "1"); ui.view = null; ui.onb = 0; render(); }
    var vis;
    if (i === 0) {
      vis = h("div", { class: "tiles" });
      [["prompt", "CRACK"], ["flag", "FLAG"], ["lock", "SMASH"], ["shield", "SOCIAL"]].forEach(function (x) {
        vis.appendChild(h("div", { class: "tile" }, ic(x[0]), h("b", { class: "ltr", text: x[1] })));
      });
    } else if (i === 1) {
      vis = h("div", { class: "qrbox sm" });
      try { var q = qrcode(0, "M"); q.addData("ITC-BT:" + player.code); q.make(); vis.innerHTML = q.createSvgTag({ cellSize: 4, margin: 0, scalable: true }); } catch (e) {}   // bundled QR library, operator code only
    } else {
      vis = h("div", { class: "ladder ltr" });
      T("rank_names").slice(0, 5).forEach(function (nm, k) {
        vis.appendChild(h("div", { class: "lrow" }, h("b", { text: "LV" + k }), h("i", { style: "width:" + (20 + k * 20) + "%" }), h("span", { text: nm })));
      });
    }
    var seg = h("div", { class: "seg" }); for (var k = 0; k < 3; k++) seg.appendChild(h("i", { class: k <= i ? "on" : "" }));
    return h("section", { class: "onb" },
      h("div", { class: "label ltr", text: T("onb_step", { n: i + 1, t: s0.k }) }),
      h("h1", { class: "bigt", text: s0.t.replace(/\\n/g, "\n") }),
      h("p", { class: "lead", text: fmt(s0.p, { g: player.goal }) }),
      vis, seg,
      h("div", { class: "row split" },
        h("button", { class: "ghost", type: "button", text: T("onb_skip"), onclick: finish }),
        h("button", { type: "button", text: i === 2 ? T("onb_go") : T("onb_next"), onclick: function () { if (i === 2) finish(); else { ui.onb = i + 1; render(); } } })));
  }

  /* ----------------------------------------------- loading / error */
  function vLoading() {
    return h("section", { class: "center" }, ic("cross", "big"), h("div", { class: "typed ltr", text: "> " + T("load_text") }), h("p", { class: "foot ctr", text: T("load_sub") }));
  }
  function vError() {
    return h("section", null, h("div", { class: "card err" }, h("div", { class: "gh" }, ic("x"), h("b", { class: "ltr", text: T("err_title") })), h("p", { text: T("err_text") })),
      h("div", { class: "row col" }, h("button", { type: "button", text: T("err_retry"), onclick: function () { ui.view = "loading"; render(); boot(); } }), h("button", { class: "ghost", type: "button", text: T("err_ask") })));
  }

  /* -------------------------------------------------------------- done */
  function vDone() {
    store("bt_done_" + player.id, "1");
    var e = player.elapsed, time = e !== undefined ? ("0" + Math.floor(e / 60)).slice(-2) + ":" + ("0" + (e % 60)).slice(-2) : "--:--";
    var role = ui.role || load("bt_role");
    var roleName = role && T("roles")[role] ? T("roles")[role][0] : null;
    var L = I18N.lang === "ar" ? { time: "الوقت", st: "الأختام" } : { time: "TIME", st: "STAMPS" };
    return h("section", null,
      h("div", { class: "label ltr", text: "MISSION COMPLETE" }),
      h("div", { class: "big", text: T("done_title") }),
      h("div", { class: "stat3" },
        h("div", null, h("span", { text: L.time }), h("b", { class: "ltr", text: time })),
        h("div", null, h("span", { text: T("pp_points") }), h("b", { text: String(player.points) })),
        h("div", null, h("span", { text: L.st }), h("b", { class: "ltr", text: stampedCount() + " /3" }))),
      roleName ? h("div", { class: "card glow" }, h("div", { class: "label", text: T("done_badge") }), h("b", { class: "ltr big2", text: roleName }), h("div", { class: "foot", text: T("done_role", { role: roleName }) })) : null,
      h("div", { class: "card glow" }, h("div", { class: "gh" }, ic("star"), h("b", { class: "ltr", text: T("hub_s3_t") })), h("p", { text: T("unl_text") })),
      h("div", { class: "card photo" }, ic("cam"), h("p", { text: T("done_photo") })),
      h("div", { class: "row" },
        h("button", { type: "button", onclick: function () { ui.view = "bonus"; render(); } }, ic("star"), " " + T("done_bonus_btn")),
        h("button", { class: "ghost", type: "button", text: T("unl_play"), onclick: function () { ui.view = "hub"; render(); } })));
  }

  /* ------------------------------------------------------ shared bits */
  function whyText(w) {
    var v = w && (w[I18N.lang] || w.en);
    if (Array.isArray(v)) return h("ul", null, v.map(function (x) { return h("li", { text: x }); }));
    return h("div", { text: v || "" });
  }
  function gameHead(n) { return gameTop(n, lvName(n)); }
  function quizSubmit(level, picks, root, head, failKey, onFail) {
    var msg = h("div", { class: "msg", role: "status", text: T("loading") });
    add(root, msg);
    return api("/api/quiz", { id: player.id, level: level, picks: picks }).then(function (r) { return r; });
  }

  /* ------------------------------------------- game 5: smash the password */
  function estimate(pw) {
    var common = ["password", "123456", "qwerty", "admin", "azerty", "itc", "algeria", "blida", "welcome", "letmein", "iloveyou"];
    var low = pw.toLowerCase().replace(/[@4]/g, "a").replace(/[30]/g, "o").replace(/[1!]/g, "i").replace(/\$/g, "s");
    if (!pw.length) return -1;
    for (var i = 0; i < common.length; i++) if (low.indexOf(common[i]) === 0 && pw.length < common[i].length + 4) return 0;
    var pool = 0;
    if (/[a-z]/.test(pw)) pool += 26; if (/[A-Z]/.test(pw)) pool += 26; if (/\d/.test(pw)) pool += 10; if (/[^A-Za-z0-9]/.test(pw)) pool += 32;
    var bits = pw.length * Math.log(pool || 1) / Math.LN2;
    return bits < 30 ? 0 : bits < 45 ? 1 : bits < 65 ? 2 : 3;
  }

  function vL5() {
    if (solved("5")) return h("section", null, gameHead(5), solvedNote());
    var cards = player.challenges["5"].cards, n = cards.length, picks = [], root = h("section");
    function tryBox() {
      var inp = h("input", { type: "text", class: "ltr", autocomplete: "off", autocapitalize: "off", spellcheck: "false", placeholder: T("l5_try_ph"), maxlength: "40" });
      var out = h("div", { class: "msg" });
      inp.addEventListener("input", function () {
        var e = estimate(inp.value);
        out.textContent = e < 0 ? "" : T("l5_len", { n: inp.value.length }) + " · " + T("l5_est")[e];
        out.className = "msg " + (e >= 2 ? "ok" : "bad");
      });
      return h("div", { class: "card" }, h("div", { class: "label", text: T("l5_try") }), inp, out, h("p", { class: "foot", text: T("l5_try_note") }));
    }
    function draw() {
      root.textContent = "";
      add(root, gameHead(5));
      add(root, h("p", { class: "lead", text: T("l5_lead") }));
      if (picks.length >= n) return finish();
      add(root, h("div", { class: "swprog", text: T("l5_progress", { i: picks.length + 1, n: n }) }));
      add(root, h("div", { class: "card" }, h("div", { class: "cipher ltr", text: cards[picks.length].pw })));
      var rungs = h("div", { class: "rungs" });
      T("l5_rungs").forEach(function (nm, i) {
        rungs.appendChild(h("button", { type: "button", class: "r" + i, text: nm, onclick: function () { picks.push(i); draw(); } }));
      });
      add(root, rungs);
      var row = h("div", { class: "row" });
      if (picks.length) row.appendChild(h("button", { class: "ghost", type: "button", text: T("l2_undo"), onclick: function () { picks.pop(); draw(); } }));
      var hb = hintBlock("5"); row.appendChild(hb.button);
      add(root, row); add(root, hb.box); add(root, tryBox());
    }
    function finish() {
      var msg = h("div", { class: "msg", role: "status", text: T("loading") });
      add(root, msg);
      api("/api/quiz", { id: player.id, level: "5", picks: picks }).then(function (r) {
        root.textContent = ""; add(root, gameHead(5));
        var retry = h("div", { class: "row" }, h("button", { type: "button", text: T("l2_retry"), onclick: function () { picks = []; draw(); } }));
        if (r.status !== 200) { add(root, h("div", { class: "msg bad", text: r.data.error || T("err_generic") })); return add(root, retry); }
        var d = r.data;
        if (!d.pass) { add(root, h("div", { class: "card" }, h("div", { class: "msg bad", text: T("l5_fail", { s: d.score, t: d.total, p: 4 }) }))); return add(root, retry); }
        add(root, h("p", { class: "lead", text: T("l5_pass", { s: d.score, t: d.total }) }));
        var rev = h("div", { class: "review" });
        (d.review || []).forEach(function (it, i) {
          var c = cards.filter(function (x) { return x.id === it.id; })[0];
          rev.appendChild(h("div", { class: "it", dir: I18N.lang === "ar" ? "rtl" : "ltr" },
            h("div", { class: "verdict real ltr", text: (c ? c.pw : "") + "  →  " + T("l5_rungs")[it.rung] }), whyText(it.why)));
        });
        add(root, rev);
        add(root, h("div", { class: "row" }, h("button", { type: "button", text: T("l5_cont"), onclick: function () { applyState(d); toast(lvName("5") + " ✓"); } })));
      });
    }
    draw();
    return root;
  }

  /* ------------------------------------------------ game 6: bead decoder */
  function vL6() {
    if (solved("6")) return h("section", null, gameHead(6), solvedNote());
    var bits = player.challenges["6"].bits;
    var wrap = h("div", { class: "beads" });
    wrap.appendChild(h("div", { class: "brow head ltr" }, h("span", { class: "bl" }), [16, 8, 4, 2, 1].map(function (v) { return h("span", { class: "bv", text: String(v) }); }), h("span", { class: "bs" })));
    bits.forEach(function (b, i) {
      var sum = parseInt(b, 2);
      var sumEl = h("span", { class: "bs", text: "?" });
      var row = h("button", { type: "button", class: "brow ltr", "aria-label": T("l6_row", { i: i + 1 }) },
        h("span", { class: "bl", text: String(i + 1) }),
        b.split("").map(function (c) { return h("span", { class: "bead" + (c === "1" ? " on" : "") }); }), sumEl);
      row.addEventListener("click", function () { sumEl.textContent = sumEl.textContent === "?" ? String(sum) : "?"; });
      wrap.appendChild(row);
    });
    var tab = h("div", { class: "azt ltr", hidden: true });
    for (var i = 0; i < 26; i++) tab.appendChild(h("span", { text: (i + 1) + "=" + String.fromCharCode(65 + i) }));
    var tg = h("button", { class: "ghost", type: "button", text: T("l6_table") });
    tg.addEventListener("click", function () { tab.hidden = !tab.hidden; tg.textContent = tab.hidden ? T("l6_table") : T("l6_table_hide"); });
    var ans = answerBox({ level: "6", label: T("l6_label"), ph: T("l6_ph"), btn: T("l6_btn"), caps: true, ltr: true, submit: function (v, msg) { return submitAnswer("6", v, msg, "l6_wrong"); } });
    return h("section", null, gameHead(6), h("p", { class: "lead", text: T("l6_lead") }), h("div", { class: "card" }, wrap), h("div", { class: "row" }, tg), tab, ans);
  }

  /* ---------------------------------------------------- game 7: hex wall */
  function vL7() {
    if (solved("7")) return h("section", null, gameHead(7), solvedNote());
    var d = player.challenges["7"];
    var grid = h("div", { class: "hexwall ltr", style: "grid-template-columns:repeat(" + d.cols + ",1fr)" });
    d.cells.forEach(function (c) { grid.appendChild(h("span", { class: "hx k" + c.k, text: c.v })); });
    var strip = h("div", { class: "azt ltr", hidden: true });
    strip.appendChild(h("span", { text: "20=␠" }));
    for (var i = 0; i < 26; i++) strip.appendChild(h("span", { text: (65 + i).toString(16).toUpperCase() + "=" + String.fromCharCode(65 + i) }));
    var tg = h("button", { class: "ghost", type: "button", text: T("l7_table") });
    tg.addEventListener("click", function () { strip.hidden = !strip.hidden; });
    var ans = answerBox({ level: "7", label: T("l7_label"), ph: T("l7_ph"), btn: T("l7_btn"), caps: true, ltr: true, submit: function (v, msg) { return submitAnswer("7", v, msg, "l7_wrong"); } });
    return h("section", null, gameHead(7), h("p", { class: "lead", text: T("l7_lead") }), h("div", { class: "card" }, grid), h("div", { class: "row" }, tg), strip, ans);
  }

  /* ------------------------------------------------ game 9: the terminal */
  function vL9() {
    if (solved("9")) return h("section", null, gameHead(9), solvedNote());
    var d = player.challenges["9"], files = d.files, hidden = d.hidden || [];
    var log = h("div", { class: "term-log ltr", "aria-live": "polite" });
    var inp = h("input", { type: "text", class: "ltr", autocomplete: "off", autocapitalize: "off", autocorrect: "off", spellcheck: "false", placeholder: T("l9_ph"), enterkeyhint: "go", "aria-label": T("l9_ph") });
    function say(t, cls) { log.appendChild(h("div", { class: cls || "", text: t })); log.scrollTop = log.scrollHeight; }
    function printable(a) { var o = ""; for (var i = 0; i < a.length; i++) { if (a[i] < 32 || a[i] > 126) return null; o += String.fromCharCode(a[i]); } return o; }
    function run() {
      var line = inp.value.trim(); inp.value = ""; if (!line) return;
      say("guest@itc:~$ " + line, "cmd");
      var parts = line.split(/\s+/), cmd = parts[0].toLowerCase();
      if (cmd === "help") say(T("l9_help"));
      else if (cmd === "clear") log.textContent = "";
      else if (cmd === "whoami") say(T("l9_whoami"));
      else if (cmd === "sudo") say(T("l9_sudo"), "bad");
      else if (cmd === "ls") {
        var all = parts[1] === "-a" || parts[1] === "-la";
        say(Object.keys(files).filter(function (f) { return all || hidden.indexOf(f) < 0; }).join("   "));
      } else if (cmd === "cat") {
        if (parts[1] && files[parts[1]] !== undefined) say(files[parts[1]]); else say(T("l9_nofile"), "bad");
      } else if (cmd === "decode") {
        var kind = (parts[1] || "").toLowerCase(), txt = parts.slice(2).join("");
        if ((kind !== "base64" && kind !== "hex") || !txt) return say(T("l9_usage_decode"), "bad");
        var out = null;
        try {
          if (kind === "base64") { var bin = atob(txt), a = []; for (var i = 0; i < bin.length; i++) a.push(bin.charCodeAt(i)); out = printable(a); }
          else if (/^([0-9a-fA-F]{2})+$/.test(txt)) { var b = []; for (var j = 0; j < txt.length; j += 2) b.push(parseInt(txt.substr(j, 2), 16)); out = printable(b); }
        } catch (e) { out = null; }
        say(out === null ? T("l9_bad_decode", { k: kind }) : out, out === null ? "bad" : "ok");
      } else if (cmd === "unlock") {
        if (parts.length < 3) return say(T("l9_usage_unlock"), "bad");
        if (files[parts[1]] === undefined) return say(T("l9_nofile"), "bad");
        api("/api/answer", { id: player.id, level: "9", answer: parts.slice(2).join("") }).then(function (r) {
          if (r.status !== 200) return say(r.data.error || T("err_generic"), "bad");
          if (r.data.correct) { say(T("l9_ok"), "ok"); setTimeout(function () { applyState(r.data); toast(lvName("9") + " ✓"); }, 1100); }
          else say(T("l9_locked"), "bad");
        });
      } else if (cmd === "hint") {
        api("/api/hint", { id: player.id, level: "9" }).then(function (r) {
          if (r.status !== 200) return say(r.data.error || T("err_generic"), "bad");
          var list = T("l9_hints"), idx = Math.min(r.data.n, list.length) - 1;
          say(T("hint_n", { n: idx + 1, m: list.length, text: fmt(list[idx], r.data.params || {}) }), "hint");
        });
      } else say(T("l9_unknown"), "bad");
    }
    inp.addEventListener("keydown", function (e) { if (e.key === "Enter") run(); });
    say(T("l9_welcome"), "ok");
    return h("section", null, gameHead(9), h("p", { class: "lead", text: T("l9_lead") }),
      h("div", { class: "term" }, log, h("div", { class: "term-in" }, h("span", { class: "ps1 ltr", text: "$" }), inp, h("button", { type: "button", text: T("l9_run"), onclick: run }))));
  }

  /* ------------------------------------------- game 10: social engineer */
  function vL10() {
    if (solved("10")) return h("section", null, gameHead(10), solvedNote());
    var cards = player.challenges["10"].cards, n = cards.length, picks = [], root = h("section");
    var rot = 0;
    function wheel() {
      var words = T("l10_wheel"), res = h("div", { class: "msg", "aria-live": "polite" });
      var disc = h("div", { class: "spin" });
      words.forEach(function (w, i) { disc.appendChild(h("span", { style: "transform:rotate(" + (i * 60) + "deg) translateY(-62px)", text: w })); });
      var btn = h("button", { class: "ghost", type: "button", text: T("l10_spin") });
      btn.addEventListener("click", function () {
        var k = Math.floor(Math.random() * words.length);
        rot += 720 + (360 - k * 60) - (rot % 360);
        disc.style.transform = "rotate(" + rot + "deg)";
        res.textContent = ""; setTimeout(function () { res.textContent = "→ " + words[k]; }, 1200);
      });
      return h("div", { class: "card wheel10" }, h("div", { class: "spinbox" }, h("i", { class: "ptr" }), disc), h("div", { class: "row" }, btn), res);
    }
    function draw() {
      root.textContent = "";
      add(root, gameHead(10));
      add(root, h("p", { class: "lead", text: T("l10_lead") }));
      if (picks.length >= n) return finish();
      if (!picks.length) add(root, wheel());
      var c = cards[picks.length], L = I18N.lang;
      add(root, h("div", { class: "swprog", text: T("l10_progress", { i: picks.length + 1, n: n }) }));
      var box = h("div", { class: "card", dir: L === "ar" ? "rtl" : "ltr" }, h("b", { text: c.title[L] || c.title.en }), h("p", { text: c.text[L] || c.text.en }));
      var opts = h("div", { class: "opts", dir: L === "ar" ? "rtl" : "ltr" });
      c.opts.forEach(function (o, i) { opts.appendChild(h("button", { type: "button", class: "opt", text: o[L] || o.en, onclick: function () { picks.push(i); draw(); } })); });
      add(root, box); add(root, opts);
      var row = h("div", { class: "row" });
      if (picks.length) row.appendChild(h("button", { class: "ghost", type: "button", text: T("l2_undo"), onclick: function () { picks.pop(); draw(); } }));
      var hb = hintBlock("10"); row.appendChild(hb.button);
      add(root, row); add(root, hb.box);
    }
    function finish() {
      add(root, h("div", { class: "msg", role: "status", text: T("loading") }));
      api("/api/quiz", { id: player.id, level: "10", picks: picks }).then(function (r) {
        root.textContent = ""; add(root, gameHead(10));
        var retry = h("div", { class: "row" }, h("button", { type: "button", text: T("l2_retry"), onclick: function () { picks = []; draw(); } }));
        if (r.status !== 200) { add(root, h("div", { class: "msg bad", text: r.data.error || T("err_generic") })); return add(root, retry); }
        var d = r.data;
        if (!d.pass) { add(root, h("div", { class: "card" }, h("div", { class: "msg bad", text: T("l10_fail", { s: d.score, t: d.total, p: 4 }) }))); return add(root, retry); }
        add(root, h("p", { class: "lead", text: T("l10_pass", { s: d.score, t: d.total }) }));
        var rev = h("div", { class: "review" });
        (d.review || []).forEach(function (it) {
          var c = cards.filter(function (x) { return x.id === it.id; })[0], L = I18N.lang;
          var o = c && c.opts[it.correct];
          rev.appendChild(h("div", { class: "it", dir: L === "ar" ? "rtl" : "ltr" },
            h("div", { class: "verdict real", text: c ? (c.title[L] || c.title.en) : "" }),
            h("div", { text: T("l10_right") + ": " + (o ? (o[L] || o.en) : "") }), whyText(it.why)));
        });
        add(root, rev);
        add(root, h("div", { class: "row" }, h("button", { type: "button", text: T("l10_cont"), onclick: function () { applyState(d); toast(lvName("10") + " ✓"); } })));
      });
    }
    draw();
    return root;
  }

  /* ---------------------------------------------------- bonus lab */
  function vBonus() {
    function item(l, title, lead) {
      return h("div", { class: "card" },
        h("div", { class: "label", text: solved(l) ? "✓ +75" : "+75" }),
        h("h2", { text: title }), h("p", { class: "lead", text: lead }),
        h("div", { class: "row" }, h("button", { type: "button", text: solved(l) ? "✓" : T("w_start"), onclick: function () { ui.view = l; render(); } })));
    }
    var elite = solved("b1") && solved("b2");
    return h("section", null,
      h("h1", { text: T("b_title") }),
      h("p", { class: "lead", text: T("b_lead") }),
      elite ? h("div", { class: "big", style: "font-size:24px", text: "★ " + T("elite") }) : null,
      item("b1", T("b1_title"), T("b1_lead")),
      item("b2", T("b2_title"), T("b2_lead")),
      h("div", { class: "row" }, h("button", { class: "ghost", type: "button", text: T("back_passport"), onclick: function () { ui.view = "passport"; render(); } })));
  }

  function vB1() {
    var d = player.challenges.b1;
    if (!d) return vBonus();
    if (solved("b1")) return h("section", null, h("h2", { text: T("b1_title") }), solvedNote());
    var cipher = d.cipher, key = d.key, n = cipher.length, i;
    var cells = [], row = h("div", { class: "vigrow" });
    for (i = 0; i < n; i++) {
      var inp = h("input", { type: "text", maxlength: "1", autocapitalize: "characters", autocomplete: "off", "aria-label": cipher[i] });
      inp.addEventListener("input", function (e) {
        var idx = cells.indexOf(e.target); e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, "");
        if (e.target.value && cells[idx + 1]) cells[idx + 1].focus();
      });
      cells.push(inp);
      row.appendChild(h("div", { class: "vigcol" }, h("span", { text: cipher[i] }), h("span", { class: "k", text: key[i % key.length] }), inp));
    }
    var tab = h("div", { class: "tabula", hidden: true });
    var tbl = h("table"), hr = h("tr", null, h("th")), r;
    for (i = 0; i < 26; i++) hr.appendChild(h("th", { text: String.fromCharCode(65 + i) }));
    tbl.appendChild(hr);
    for (r = 0; r < 26; r++) {
      var tr = h("tr", null, h("th", { text: String.fromCharCode(65 + r) }));
      for (i = 0; i < 26; i++) tr.appendChild(h("td", { text: String.fromCharCode(65 + (i + r) % 26) }));
      tbl.appendChild(tr);
    }
    tab.appendChild(tbl);
    var tgl = h("button", { class: "ghost", type: "button", text: T("b1_table") });
    tgl.addEventListener("click", function () { tab.hidden = !tab.hidden; tgl.textContent = tab.hidden ? T("b1_table") : T("b1_table_hide"); });
    var msg = h("div", { class: "msg", role: "status" }), go = h("button", { type: "button", text: T("b1_btn") });
    var hb = hintBlock("b1");
    go.addEventListener("click", function () {
      go.disabled = true;
      submitAnswer("b1", cells.map(function (c) { return c.value || " "; }).join(""), msg, "b1_wrong").then(function () { go.disabled = false; });
    });
    return h("section", null,
      h("div", { class: "label", text: T("b_title") }), h("h2", { text: T("b1_title") }),
      h("p", { class: "lead", text: T("b1_lead") }),
      h("div", { class: "card" },
        h("div", { class: "label", text: T("b1_cipher") + " / " + T("b1_key") + " / " + T("b1_plain") }), row, tgl, tab),
      h("div", { class: "row" }, go, hb.button), msg, hb.box,
      h("div", { class: "row" }, h("button", { class: "ghost", type: "button", text: T("b_title"), onclick: function () { ui.view = "bonus"; render(); } })));
  }

  function vB2() {
    var d = player.challenges.b2;
    if (!d) return vBonus();
    if (solved("b2")) return h("section", null, h("h2", { text: T("b2_title") }), solvedNote());
    var tool = "base64";
    var tin = h("textarea", { class: "tin", spellcheck: "false", autocomplete: "off", autocapitalize: "off", "aria-label": T("b2_input") });
    var tout = h("div", { class: "tout", "aria-live": "polite", text: T("ready") });
    var keyIn = h("input", { type: "text", class: "ltr", maxlength: "2", placeholder: "00", autocomplete: "off", "aria-label": T("b2_key") });
    var keyWrap = h("div", { hidden: true }, h("label", { class: "f" }, T("b2_key"), keyIn));
    var sel = h("div", { class: "toolsel", role: "group" });
    ["base64", "binary", "hex", "xor"].forEach(function (t) {
      var b = h("button", { type: "button", "aria-pressed": t === tool ? "true" : "false", text: T("tools")[t] });
      b.dataset.t = t;
      b.addEventListener("click", function () {
        tool = t; keyWrap.hidden = t !== "xor";
        [].forEach.call(sel.children, function (x) { x.setAttribute("aria-pressed", String(x.dataset.t === tool)); });
      });
      sel.appendChild(b);
    });
    function bytesToStr(arr) { var o = ""; for (var i = 0; i < arr.length; i++) { if (arr[i] < 32 || arr[i] > 126) return null; o += String.fromCharCode(arr[i]); } return o; }
    function hexBytes(str) { str = str.replace(/\s+/g, ""); if (!/^[0-9a-fA-F]*$/.test(str) || str.length % 2 || !str.length) return null; var a = []; for (var i = 0; i < str.length; i += 2) a.push(parseInt(str.substr(i, 2), 16)); return a; }
    function run() {
      var v = tin.value.trim(), out = null;
      try {
        if (tool === "base64") { var bin = atob(v); var a = []; for (var i = 0; i < bin.length; i++) a.push(bin.charCodeAt(i)); out = bytesToStr(a); }
        else if (tool === "binary") { var b = v.replace(/\s+/g, ""); if (/^[01]+$/.test(b) && b.length % 8 === 0) { var arr = []; for (var j = 0; j < b.length; j += 8) arr.push(parseInt(b.substr(j, 8), 2)); out = bytesToStr(arr); } }
        else if (tool === "hex") { var hb2 = hexBytes(v); out = hb2 ? bytesToStr(hb2) : null; }
        else { var hx = hexBytes(v), kb = parseInt(keyIn.value, 16); if (hx && !isNaN(kb)) out = bytesToStr(hx.map(function (x) { return x ^ kb; })); }
      } catch (e) { out = null; }
      tout.textContent = out === null ? T("b2_bad") : out;
      tout.style.color = out === null ? "var(--hot)" : "var(--ok)";
    }
    var msg = h("div", { class: "msg", role: "status" });
    var enc = h("div", { class: "cipher", text: d.encoded });
    var ans = answerBox({
      level: "b2", label: T("b2_ph"), ph: T("b2_ph"), btn: T("b2_btn"), caps: true, ltr: true,
      submit: function (v, m) { return submitAnswer("b2", v, m, "b2_wrong"); }
    });
    return h("section", null,
      h("div", { class: "label", text: T("b_title") }), h("h2", { text: T("b2_title") }),
      h("p", { class: "lead", text: T("b2_lead") }),
      h("div", { class: "card" },
        h("div", { class: "label", text: T("b2_encoded") }), enc,
        d.key ? h("div", { class: "foot ltr", text: "XOR key: " + d.key }) : null),
      h("div", { class: "card" },
        h("div", { class: "label", text: T("b2_tool") }), sel, keyWrap,
        h("label", { class: "f" }, T("b2_input"), tin),
        h("div", { class: "row" },
          h("button", { class: "ghost", type: "button", text: T("b2_copy_msg"), onclick: function () { tin.value = d.encoded; } }),
          h("button", { type: "button", text: T("b2_run"), onclick: run }),
          h("button", { class: "ghost", type: "button", text: T("b2_use"), onclick: function () { if (tout.style.color !== "var(--hot)") tin.value = tout.textContent; } })),
        h("div", { class: "label", style: "margin-top:12px", text: T("b2_output") }), tout),
      ans, msg,
      h("div", { class: "row" }, h("button", { class: "ghost", type: "button", text: T("b_title"), onclick: function () { ui.view = "bonus"; render(); } })));
  }

  /* --------------------------------------------------------- plumbing */
  function setupGlobal() {
    $("langBtn").addEventListener("click", function () { I18N.set(I18N.lang === "ar" ? "en" : "ar"); render(); });
    $("idBtn").addEventListener("click", showId);
    // keep the focused field visible when the on-screen keyboard opens
    document.addEventListener("focusin", function (e) {
      var t = e.target;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) && t.type !== "checkbox" && t.type !== "radio" && t.type !== "range") {
        document.body.classList.add("kb");
        setTimeout(function () { try { t.scrollIntoView({ block: "center", behavior: "smooth" }); } catch (x) {} }, 320);
      }
    });
    document.addEventListener("focusout", function () {
      setTimeout(function () { var a = document.activeElement; if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) document.body.classList.remove("kb"); }, 100);
    });
    var net = $("net");
    function netState() { net.hidden = navigator.onLine; net.textContent = T("offline"); }
    window.addEventListener("online", netState); window.addEventListener("offline", netState); netState();
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(function () {});
  }

  var pollT = null;
  function poll() {
    clearTimeout(pollT);
    pollT = setTimeout(function () {
      var calm = !ui.view || ui.view === "hub" || ui.view === "passport";
      if (player && calm && !document.hidden && readyCount() > 0) {
        api("/api/me?id=" + encodeURIComponent(player.id)).then(function (r) {
          if (r.status === 200) {
            var before = stampedCount(); player.tracks && (r.data.id = player.id);
            var changed = TRACKS.some(function (t) { return !player.tracks[t].stamp && r.data.tracks[t].stamp; });
            if (changed) applyState(r.data, true);
            else if (before !== undefined) { player.points = r.data.points; }
          }
          poll();
        });
      } else poll();
    }, 5000);
  }

  function boot() {
    I18N.init();
    setupGlobal();
    var saved = load("bt_id");
    if (!saved) { render(); return poll(); }
    ui.view = "loading"; render();
    api("/api/me?id=" + encodeURIComponent(saved)).then(function (r) {
      ui.view = null;
      if (r.status === 200) { player = r.data; player.id = saved; }
      else if (r.status === 404) store("bt_id", null);
      else { ui.view = "error"; }
      render(); poll();
    });
  }
  boot();
})();
