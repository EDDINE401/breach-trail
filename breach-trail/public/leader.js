/* ITC Breach Trail : leader portal (stamp players, log, stats, exports) */
(function () {
  "use strict";
  var L = {
    en: { login: "Leader sign in", pin: "Leader PIN", go: "SIGN IN", out: "Sign out", level: "Level to stamp", scan: "SCAN QR", stop: "STOP CAMERA",
      manual: "Or type operator code", look: "LOOK UP", stamp: "STAMP SELECTED", stamped: "Stamped", solved: "Solved", open: "Not solved yet", done: "Stamp saved for",
      tabs: ["Stamp", "Log", "Stats", "Export"], nocam: "Live camera needs the HTTPS address. Use the photo button or type the code.", photo: "TAKE PHOTO OF QR", nophoto: "No ITC QR found in that photo. Try again closer.", all: "SELECT ALL", pts: "pts",
      players: "Operators", finished: "Finished", signups: "Sign-ups", avgt: "avg time", avga: "avg tries", avgh: "avg hints", by: "Stamps by leader",
      ex: "Download CSV", exs: "Stamp audit log", exp: "Players (lead only)", exu: "Sign-ups (lead only)", empty: "Nothing yet.", net: "Network error.",
      lv: {"1":"Crack the Code","2":"Spot the Phish","3":"Find the Flag","4":"Join the Team","5":"Smash the Password","6":"Bead Decoder","7":"Hex Wall","9":"Escape the Terminal","10":"Social Engineer"}, tr: {motivated: "MOTIVATED", genius: "GENIUS", positive: "POSITIVE"}, ready: "READY", note: "A stamp unlocks when the player solves any game in its track. Stamped rows are locked in.", ready_n: "STAMPS · {n} READY", pick: "Pick a stamp first.", lead: "LEAD", sess: "Session expired. Sign in again." },
    ar: { login: "دخول القادة", pin: "رمز القائد", go: "دخول", out: "خروج", level: "المستوى المراد ختمه", scan: "امسح QR", stop: "أوقف الكاميرا",
      manual: "أو اكتب رمز المشغّل", look: "بحث", stamp: "اختم المحدد", stamped: "مختوم", solved: "محلول", open: "لم يُحل بعد", done: "تم حفظ الختم لـ",
      tabs: ["ختم", "السجل", "الإحصاءات", "تصدير"], nocam: "الكاميرا المباشرة تحتاج عنوان HTTPS. استعمل زر الصورة أو اكتب الرمز.", photo: "صوّر رمز QR", nophoto: "لم يُعثر على رمز ITC في الصورة. حاول من مسافة أقرب.", all: "تحديد الكل", pts: "نقطة",
      players: "المشغّلون", finished: "أنهوا", signups: "التسجيلات", avgt: "متوسط الوقت", avga: "متوسط المحاولات", avgh: "متوسط التلميحات", by: "الأختام لكل قائد",
      ex: "تنزيل CSV", exs: "سجل تدقيق الأختام", exp: "اللاعبون (للقائد الرئيسي)", exu: "التسجيلات (للقائد الرئيسي)", empty: "لا شيء بعد.", net: "خطأ في الشبكة.",
      lv: {"1":"اكسر الشيفرة","2":"اكشف التصيّد","3":"اعثر على العلَم","4":"انضم إلى الفريق","5":"حطّم كلمة السر","6":"فكّ الخرز","7":"جدار الهكس","9":"اهرب من الطرفية","10":"مهندس اجتماعي"}, tr: {motivated: "متحمّس", genius: "عبقري", positive: "إيجابي"}, ready: "جاهز", note: "يُفتح الختم عند حلّ أي لعبة في مساره. الصفوف المختومة مثبّتة.", ready_n: "الأختام · {n} جاهزة", pick: "اختر ختماً أولاً.", lead: "رئيسي", sess: "انتهت الجلسة. سجّل الدخول من جديد." }
  };
  var T = function (k) { var d = L[I18N.lang] || L.en; return d[k]; };
  var TRK = ["motivated", "genius", "positive"], TICON = { motivated: "bolt", genius: "bulb", positive: "smile" };
  function ic(n) { var w = document.createElement("div"); w.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; return w.firstChild; }
  var app = document.getElementById("app");
  var token = null, me = null, tab = 0, sel = [], found = null, stream = null, scanning = false, msgText = "", msgCls = "";
  try { token = sessionStorage.getItem("bt_ltoken"); me = JSON.parse(sessionStorage.getItem("bt_lme") || "null"); } catch (e) {}

  function h(tag, a) {
    var el = document.createElement(tag);
    if (a) Object.keys(a).forEach(function (k) {
      var v = a[k]; if (v === null || v === undefined || v === false) return;
      if (k === "class") el.className = v; else if (k === "text") el.textContent = v;
      else if (k.indexOf("on") === 0) el.addEventListener(k.slice(2), v); else el.setAttribute(k, v === true ? "" : v);
    });
    for (var i = 2; i < arguments.length; i++) (function add(c) {
      if (c === null || c === undefined || c === false) return;
      if (Array.isArray(c)) c.forEach(add); else el.appendChild(typeof c === "object" ? c : document.createTextNode(String(c)));
    })(arguments[i]);
    return el;
  }
  function call(path, body) {
    var o = { headers: {} };
    if (token) o.headers.Authorization = "Bearer " + token;
    if (body !== undefined) { o.method = "POST"; o.headers["Content-Type"] = "application/json"; o.body = JSON.stringify(body); }
    return fetch(path, o).then(function (r) {
      if (r.status === 401 && token) { signedOut(); }
      return r.json().then(function (d) { return { status: r.status, data: d }; });
    }).catch(function () { return { status: 0, data: { error: T("net") } }; });
  }
  function signedOut() { stopCam(); token = null; me = null; try { sessionStorage.removeItem("bt_ltoken"); sessionStorage.removeItem("bt_lme"); } catch (e) {} }
  function say(t, c) { msgText = t; msgCls = c || ""; var m = document.getElementById("msg"); if (m) { m.textContent = t; m.className = "msg " + msgCls; } }

  /* ------------------------------------------------------------ login */
  function vLogin() {
    var val = "", dots = h("div", { class: "pdots ltr", "aria-live": "polite" });
    var m = h("div", { class: "msg", id: "msg", role: "status" });
    function paint() { dots.textContent = ""; for (var i = 0; i < Math.max(4, val.length); i++) dots.appendChild(h("i", { class: i < val.length ? "on" : (i === val.length ? "cur" : "") })); }
    function go() {
      if (!val) return;
      call("/api/leader/login", { pin: val }).then(function (r) {
        if (r.status === 200) {
          token = r.data.token; me = { name: r.data.name, admin: r.data.admin };
          try { sessionStorage.setItem("bt_ltoken", token); sessionStorage.setItem("bt_lme", JSON.stringify(me)); } catch (e) {}
          msgText = ""; render();
        } else { m.textContent = r.data.error || T("net"); m.className = "msg bad"; val = ""; paint(); }
      });
    }
    var pad = h("div", { class: "keypad ltr" });
    ["1", "2", "3", "4", "5", "6", "7", "8", "9", "x", "0", "ok"].forEach(function (k) {
      pad.appendChild(h("button", { type: "button", class: k === "ok" ? "" : "ghost", "aria-label": k === "x" ? "clear" : k === "ok" ? "sign in" : k,
        onclick: function () { if (k === "x") val = ""; else if (k === "ok") return go(); else if (val.length < 8) val += k; paint(); } },
        k === "x" ? ic("x") : k === "ok" ? ic("check") : k));
    });
    paint();
    return h("section", null, h("div", { class: "label", text: "STAFF ACCESS" }), h("h1", { text: T("login") }), h("p", { class: "lead", text: T("pin") }), dots, m, pad);
  }

  /* ------------------------------------------------------------ stamp tab */
  function stopCam() { scanning = false; if (stream) { stream.getTracks().forEach(function (t) { t.stop(); }); stream = null; } }

  function lookup(code, method) {
    code = String(code || "").trim().replace(/^ITC-BT:/i, "").toUpperCase();
    if (!code) return;
    call("/api/leader/lookup?code=" + encodeURIComponent(code)).then(function (r) {
      if (r.status === 200) { found = r.data; found.method = method; sel = TRK.filter(function (t) { return found.tracks[t].ready; }); say("", ""); stopCam(); render(); }
      else say(r.data.error || T("net"), "bad");
    });
  }

  function startCam(video) {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia || !window.isSecureContext) { scanning = false; say(T("nocam"), "bad"); render(); return; }
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false }).then(function (s) {
      stream = s; scanning = true; video.srcObject = s; video.setAttribute("playsinline", ""); video.play();
      var det = null; try { if (window.BarcodeDetector) det = new BarcodeDetector({ formats: ["qr_code"] }); } catch (e) {}
      var cv = document.createElement("canvas"), cx = cv.getContext("2d", { willReadFrequently: true });
      (function tick() {
        if (!scanning) return;
        if (video.readyState >= 2) {
          var done = function (txt) { if (txt && /^ITC-BT:/i.test(txt)) { lookup(txt, "scan"); } else setTimeout(tick, 200); };
          if (det) det.detect(video).then(function (c) { done(c.length ? c[0].rawValue : ""); }).catch(function () { setTimeout(tick, 250); });
          else {
            cv.width = video.videoWidth; cv.height = video.videoHeight; cx.drawImage(video, 0, 0);
            var d = cx.getImageData(0, 0, cv.width, cv.height), q = window.jsQR && jsQR(d.data, d.width, d.height);
            done(q ? q.data : "");
          }
        } else setTimeout(tick, 150);
      })();
    }).catch(function () { scanning = false; say(T("nocam"), "bad"); render(); });
  }

  function photoScan(file) {
    if (!file) return;
    var img = new Image(), url = URL.createObjectURL(file);
    img.onload = function () {
      var scale = Math.min(1, 1400 / Math.max(img.width, img.height));
      var cv = document.createElement("canvas"); cv.width = Math.round(img.width * scale); cv.height = Math.round(img.height * scale);
      var cx = cv.getContext("2d", { willReadFrequently: true }); cx.drawImage(img, 0, 0, cv.width, cv.height);
      URL.revokeObjectURL(url);
      var d = cx.getImageData(0, 0, cv.width, cv.height), q = window.jsQR && jsQR(d.data, d.width, d.height, { inversionAttempts: "attemptBoth" });
      if (q && /^ITC-BT:/i.test(q.data)) lookup(q.data, "scan"); else say(T("nophoto"), "bad");
    };
    img.onerror = function () { URL.revokeObjectURL(url); say(T("nophoto"), "bad"); };
    img.src = url;
  }

  function vStamp() {
    var wrap = h("section", null);
    var msg = h("div", { class: "msg " + msgCls, id: "msg", role: "status", text: msgText });

    if (found) {
      var elig = TRK.filter(function (t) { return found.tracks[t].ready; });
      sel = sel.filter(function (t) { return elig.indexOf(t) >= 0; });
      var btn;
      function refresh() { btn.disabled = !sel.length; btn.lastChild.textContent = " " + T("stamp") + (sel.length ? " (" + sel.length + ")" : ""); }
      var rows = TRK.map(function (t) {
        var tr = found.tracks[t], can = tr.ready;
        var games = tr.games.map(function (g) { return T("lv")[g] + (tr.solved.indexOf(g) >= 0 ? " ✓" : ""); }).join(" · ");
        var cb = h("input", { type: "checkbox", id: "tr" + t, disabled: !can, checked: can && sel.indexOf(t) >= 0, class: "tck" });
        cb.addEventListener("change", function () { sel = sel.filter(function (x) { return x !== t; }); if (cb.checked) sel.push(t); refresh(); });
        return h("label", { for: "tr" + t, class: "trow" + (can ? " ready" : tr.stamp ? " done" : "") },
          cb, h("span", { class: "tbody" }, h("b", { class: "ltr", text: T("tr")[t] }), h("small", { text: tr.stamp ? tr.stamp.leader + " · stamped" : games })), ic(TICON[t]));
      });
      btn = h("button", { type: "button", onclick: function () {
        if (!sel.length) { say(T("pick"), "bad"); return; }
        btn.disabled = true;
        call("/api/leader/stamp", { code: found.code, tracks: sel, method: found.method }).then(function (r) {
          if (r.status === 200) { say(T("done") + " " + r.data.nickname + " (" + r.data.done.map(function (x) { return T("tr")[x]; }).join(", ") + ")", "good"); found = null; sel = []; render(); }
          else { say(r.data.error || T("net"), "bad"); refresh(); }
        });
      } }, ic("stamp"), h("span", { text: " " + T("stamp") }));
      var all = h("button", { class: "ghost", type: "button", text: T("all"), onclick: function () { sel = elig.slice(); render(); } });
      wrap.appendChild(h("div", { class: "card pcard" }, ic("finger"), h("div", { class: "pinfo" }, h("b", { class: "ltr", text: found.nickname }), h("small", { class: "ltr", text: found.code + " · LV" + Math.min(found.level, 4) })), h("span", { class: "pill ltr", text: found.points + " PTS" })));
      wrap.appendChild(h("div", { class: "label", text: T("ready_n").replace("{n}", elig.length) }));
      wrap.appendChild(h("div", { class: "trows" }, rows));
      wrap.appendChild(h("p", { class: "foot", text: T("note") }));
      wrap.appendChild(msg);
      wrap.appendChild(h("div", { class: "row" }, btn, elig.length > 1 ? all : null, h("button", { class: "ghost", type: "button", "aria-label": "close", onclick: function () { found = null; sel = []; say("", ""); render(); } }, ic("x"))));
      refresh();
      return wrap;
    }
    var video = h("video", { muted: true, playsinline: true, style: "width:100%;border-radius:12px;background:#000;max-height:46vh;object-fit:cover" });
    var code = h("input", { type: "text", autocomplete: "off", autocapitalize: "characters", class: "ltr", "aria-label": T("manual") });
    code.addEventListener("keydown", function (e) { if (e.key === "Enter") lookup(code.value, "manual"); });
    var cam = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext);
    var photo = h("input", { type: "file", accept: "image/*", capture: "environment", hidden: true });
    photo.addEventListener("change", function () { photoScan(photo.files[0]); photo.value = ""; });
    wrap.appendChild(h("div", { class: "card" },
      scanning ? video : null,
      h("div", { class: "row" },
        cam ? h("button", { type: "button", text: scanning ? T("stop") : T("scan"), onclick: function () { if (scanning) { stopCam(); render(); } else { scanning = true; render(true); } } }) : null,
        h("button", { type: "button", class: cam ? "ghost" : "", text: T("photo"), onclick: function () { photo.click(); } })),
      photo,
      cam ? null : h("p", { class: "lead", style: "margin:10px 0 0;font-size:13px", text: T("nocam") }),
      h("label", { class: "f", text: T("manual") }), code,
      h("div", { class: "row" }, h("button", { class: "ghost", type: "button", text: T("look"), onclick: function () { lookup(code.value, "manual"); } })), msg));
    return wrap;
  }

  /* ------------------------------------------------------------ log / stats / export */
  function vLog() {
    var box = h("div", { class: "card" }, h("p", { class: "lead", text: T("empty") }));
    call("/api/leader/log").then(function (r) {
      if (r.status !== 200 || !r.data.rows.length) return;
      box.textContent = "";
      r.data.rows.forEach(function (x) {
        var ts = new Date(x.timestamp); var t = isNaN(ts) ? x.timestamp : ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        box.appendChild(h("div", { style: "padding:8px 0;border-top:1px solid var(--line)" },
          h("b", { text: x.nickname + " · L" + x.level }), h("div", { class: "lead ltr", style: "margin:0;font-size:13px", text: t + " · " + x.leader + " · " + x.operator_code + " · " + x.time_spent_s + "s · x" + x.attempts })));
      });
    });
    return h("section", null, box);
  }

  function vStats() {
    var box = h("div", null);
    call("/api/leader/stats").then(function (r) {
      if (r.status !== 200) return; var d = r.data;
      box.appendChild(h("div", { class: "stat" }, h("div", null, h("b", { text: d.players }), h("span", { text: T("players") })), h("div", null, h("b", { text: d.finished }), h("span", { text: T("finished") })), h("div", null, h("b", { text: d.signups }), h("span", { text: T("signups") }))));
      ["1", "2", "3", "5", "6", "7", "9", "10", "4", "b1", "b2"].forEach(function (l) {
        var s = d.levels[l]; if (!s) return;
        var name = /^\d+$/.test(l) ? l + " · " + T("lv")[l] : l.toUpperCase();
        box.appendChild(h("div", { class: "card" }, h("b", { text: name }),
          h("div", { class: "lead ltr", style: "margin:4px 0 0", text: "✓ " + s.solved + " · stamped " + s.stamped + " · " + T("avgt") + " " + s.avg_seconds + "s · " + T("avga") + " " + s.avg_attempts + " · " + T("avgh") + " " + s.avg_hints })));
      });
      var by = Object.keys(d.by_leader || {});
      if (by.length) box.appendChild(h("div", { class: "card" }, h("div", { class: "label", text: T("by") }), by.map(function (k) { return h("div", { class: "ltr", text: k + ": " + d.by_leader[k] }); })));
    });
    return h("section", null, box);
  }

  function download(kind) {
    fetch("/api/leader/export?kind=" + kind, { headers: { Authorization: "Bearer " + token } }).then(function (r) {
      if (!r.ok) return r.json().then(function (d) { say(d.error || T("net"), "bad"); });
      return r.blob().then(function (b) {
        var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = "breach-trail-" + kind + ".csv";
        document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
      });
    }).catch(function () { say(T("net"), "bad"); });
  }
  function vExport() {
    var items = [h("button", { type: "button", text: T("ex") + " · " + T("exs"), onclick: function () { download("stamps"); } })];
    if (me && me.admin) {
      items.push(h("button", { class: "ghost", type: "button", text: T("ex") + " · " + T("exp"), onclick: function () { download("players"); } }));
      items.push(h("button", { class: "ghost", type: "button", text: T("ex") + " · " + T("exu"), onclick: function () { download("signups"); } }));
    }
    return h("section", null, h("div", { class: "card" }, h("div", { style: "display:grid;gap:10px" }, items), h("div", { class: "msg", id: "msg", role: "status" })));
  }

  /* ------------------------------------------------------------ shell */
  function render(startScan) {
    var lb = document.getElementById("langBtn"); lb.title = I18N.lang === "ar" ? "English" : "العربية";
    app.textContent = "";
    var navEl = document.getElementById("tabs"); if (navEl) navEl.hidden = true; document.body.classList.remove("hastabs");
    if (!token) { app.appendChild(vLogin()); return; }
    if (tab !== 0) stopCam();
    app.appendChild(h("div", { style: "display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:8px" },
      h("b", { text: me.name + (me.admin ? " · " + T("lead") : "") }),
      h("button", { class: "ghost", type: "button", style: "min-height:40px;padding:6px 12px", text: T("out"), onclick: function () { call("/api/leader/logout", {}); signedOut(); render(); } })));
    app.appendChild([vStamp, vLog, vStats, vExport][tab]());
    var nav = document.getElementById("tabs"); nav.hidden = false; nav.textContent = ""; document.body.classList.add("hastabs");
    [["stamp", 0], ["log", 1], ["stats", 2], ["down", 3]].forEach(function (t) {
      nav.appendChild(h("button", { type: "button", class: tab === t[1] ? "on" : "", onclick: function () { tab = t[1]; found = null; msgText = ""; render(); } }, ic(t[0]), h("span", { text: T("tabs")[t[1]] })));
    });
    if (startScan && tab === 0) { var v = app.querySelector("video"); if (v) startCam(v); else scanning = false; }
  }
  document.getElementById("langBtn").addEventListener("click", function () { I18N.set(I18N.lang === "ar" ? "en" : "ar"); render(); });
  I18N.init(); render();
})();
