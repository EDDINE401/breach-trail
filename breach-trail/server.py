#!/usr/bin/env python3
"""ITC // Red Team: Breach Trail. Stand game server (standard library only).

Run:   python server.py            (or: python3 server.py 8080)
HTTPS: put cert.pem and key.pem next to this file and it starts in HTTPS mode.
"""
import base64
import gzip
import csv
import hmac
import io
import json
import os
import random
import re
import secrets
import socket
import ssl
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import content

BASE = Path(__file__).resolve().parent
PUBLIC = BASE / "public"
DATA = BASE / "data"
PLAYERS_FILE = DATA / "players.json"
LEADERS_FILE = DATA / "leaders.json"
CONFIG_FILE = DATA / "config.json"
STAMPS_FILE = DATA / "stamps.csv"
SIGNUPS_FILE = DATA / "signups.csv"

LOCK = threading.RLock()
rng = random.SystemRandom()

# Every game is open from the start and players pick what they like. Join the Team ("4") is the sign-up form.
GAMES = ["1", "2", "3", "5", "6", "7", "9", "10", "4"]
CORE = GAMES            # kept as an alias: stamps, stats and exports loop over every game
CORE3 = ["1", "2", "3"]          # step 1
CORE4 = CORE3 + ["4"]             # step 2: join the team, then collect stamps (step 3), then everything unlocks
GZ_CACHE = {}
TRACKS = {"motivated": ["3", "9", "5"], "genius": ["1", "6", "7"], "positive": ["2", "4", "10"]}
TRACK_OF = {g: t for t, gs in TRACKS.items() for g in gs}
EVENTS = []             # in-memory feed for the projector (join, solve, stamp, finish)
BONUS = ["b1", "b2"]    # bonus labs unlock once the finish goal is reached
DEFAULT_GOAL = 4        # solve this many games to finish (change finish_goal in data/config.json)
POINTS = {g: 100 for g in GAMES}
POINTS.update({"b1": 75, "b2": 75})
LEVEL_NAMES = {"1": "Code Cracked", "2": "Phish Spotted", "3": "Flag Captured", "4": "Access Granted",
               "5": "Password Smashed", "6": "Binary Decoded", "7": "Wall Decoded", "9": "Terminal Escaped",
               "10": "Social Engineer Beaten", "b1": "Vigenere Lab", "b2": "Decoder Lab"}
PASS_SCORE = 5
QUIZ_PASS = 4
PWD = {w["id"]: w for w in content.PASSWORDS}
SOC = {e["id"]: e for e in content.SOCIAL}
ROLES = {"Attacker", "Defender", "Builder", "Teacher", "Storyteller"}
YEARS = {"1st year", "2nd year", "3rd year", "4th year", "5th year or more", "Other"}
CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"

MAX_BODY = 8192
THROTTLE_SECONDS = 0.6
TOKEN_TTL = 12 * 3600
LOGIN_MAX_FAILS = 5
LOGIN_LOCK_SECONDS = 60

STAMP_HEADER = ["timestamp", "operator_code", "nickname", "leader", "method", "level", "level_name",
                "time_spent_s", "attempts", "hints_used"]
SIGNUP_HEADER = ["time", "operator_code", "nickname", "name", "year", "field", "role", "wants_to_learn", "contact"]

STATIC = {
    "/": "index.html", "/index.html": "index.html",
    "/leader": "leader.html", "/leader.html": "leader.html",
    "/board": "board.html", "/board.html": "board.html",
    "/style.css": "style.css", "/app.js": "app.js", "/i18n.js": "i18n.js",
    "/leader.js": "leader.js", "/board.js": "board.js", "/sw.js": "sw.js",
    "/manifest.webmanifest": "manifest.webmanifest", "/icon.svg": "icon.svg",
    "/vendor/qrcode.js": "vendor/qrcode.js", "/vendor/jsQR.js": "vendor/jsQR.js",
}
FONT_RE = re.compile(r"^/fonts/([a-z0-9._-]+\.woff2)$")
CTYPES = {".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
          ".js": "application/javascript; charset=utf-8", ".svg": "image/svg+xml",
          ".webmanifest": "application/manifest+json", ".woff2": "font/woff2"}
CSP = ("default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; "
       "connect-src 'self'; font-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'")

players = {}
leaders = []
config = {}
leader_tokens = {}
login_fails = {}
SCEN = {s["id"]: s for s in content.SCENARIOS}


# ------------------------------------------------------------------ storage
def load_json(path, default):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return default


def save_json(path, obj):
    DATA.mkdir(exist_ok=True)
    tmp = path.with_suffix(".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def init_data():
    global players, leaders, config
    DATA.mkdir(exist_ok=True)
    players = {k: v for k, v in load_json(PLAYERS_FILE, {}).items() if isinstance(v, dict) and "ch" in v}
    leaders = load_json(LEADERS_FILE, None)
    if not leaders:
        leaders = [{"name": "Lead", "pin": f"{rng.randint(0, 999999):06d}", "admin": True}] + [
            {"name": f"Helper {i}", "pin": f"{rng.randint(0, 999999):06d}", "admin": False} for i in (1, 2, 3)]
        save_json(LEADERS_FILE, leaders)
    config = load_json(CONFIG_FILE, None)
    if not config:
        config = {"finish_goal": DEFAULT_GOAL,
                  "station_pins": {n: f"{rng.randint(0, 9999):04d}" for n in GAMES}}
        save_json(CONFIG_FILE, config)
    config.setdefault("finish_goal", DEFAULT_GOAL)
    config.setdefault("station_pins", {})
    for n in GAMES:
        config["station_pins"].setdefault(n, f"{rng.randint(0, 9999):04d}")
    save_json(CONFIG_FILE, config)
    for p in players.values():
        ensure_player(p)


def save_players():
    save_json(PLAYERS_FILE, players)


def append_csv(path, header, row):
    new = not path.exists()
    with path.open("a", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        if new:
            w.writerow(header)
        w.writerow([csv_safe(str(x)) for x in row])


def csv_safe(value):
    return "'" + value if value and value[0] in "=+-@" else value


def clean_text(value, limit):
    if not isinstance(value, str):
        return ""
    value = re.sub(r"[\x00-\x1f\x7f]", " ", value)
    return re.sub(r"\s+", " ", value).strip()[:limit]


# --------------------------------------------------------------- challenges
def caesar(text, k):
    return "".join(chr((ord(c) - 65 + k) % 26 + 65) if "A" <= c <= "Z" else c for c in text)


def vigenere(text, key):
    out, i = [], 0
    for c in text:
        shift = ord(key[i % len(key)]) - 65
        out.append(chr((ord(c) - 65 + shift) % 26 + 65))
        i += 1
    return "".join(out)


def make_l1():
    k = rng.randint(1, 25)
    word = rng.choice(content.CAESAR_WORDS)
    plain = rng.choice(content.CAESAR_PREFIXES) + " " + word
    return {"k": k, "answer": word, "cipher": caesar(plain, k)}


def make_l2():
    fake = [s["id"] for s in content.SCENARIOS if s["fake"]]
    real = [s["id"] for s in content.SCENARIOS if not s["fake"]]
    ids = rng.sample(fake, 3) + rng.sample(real, 3)
    rng.shuffle(ids)
    return {"ids": ids}


def make_l3():
    flag = "ITC{%s_%s}" % (rng.choice(content.FLAG_WORDS), secrets.token_hex(2))
    place = rng.choice(["elements", "console", "network"])
    decoy = "ITC{nothing_here_keep_looking}"
    note = flag if place == "elements" else "dev note: nothing to see here, check the other tabs"
    tree = {"tag": "html", "attrs": {"lang": "en"}, "children": [
        {"tag": "head", "children": [
            {"tag": "title", "text": "ITC Vault"},
            {"tag": "meta", "attrs": {"charset": "utf-8"}},
            {"tag": "script", "attrs": {"src": "/static/vault.js"}}]},
        {"tag": "body", "children": [
            {"tag": "div", "attrs": {"id": "app", "class": "vault"}, "children": [
                {"tag": "header", "children": [{"tag": "h1", "text": "ITC Vault"}, {"tag": "p", "text": "Staff only"}]},
                {"tag": "form", "attrs": {"id": "login"}, "children": [
                    {"tag": "input", "attrs": {"name": "user", "placeholder": "username"}},
                    {"tag": "input", "attrs": {"name": "pass", "type": "password", "data-token": "dGhpcyBpcyBub3QgdGhlIGZsYWc="}},
                    {"tag": "button", "text": "Enter"}]},
                {"tag": "footer", "children": [
                    {"tag": "p", "text": "ITC Blida Scientific Club"},
                    {"tag": "div", "attrs": {"class": "meta"}, "children": [
                        {"tag": "div", "attrs": {"class": "build"}, "children": [
                            {"comment": " build 2026.10 "},
                            {"comment": " " + note + " "}]}]}]}]}]}]}
    console = [
        {"level": "log", "text": "[vault] booting..."},
        {"level": "log", "text": "[vault] loaded 4 modules"},
        {"level": "warn", "text": "[vault] deprecated: v1 login endpoint"},
        {"level": "log", "text": "[debug] session token => " + (flag if place == "console" else "null")},
        {"level": "error", "text": "[vault] favicon.ico not found"},
        {"level": "log", "text": "[vault] ready"},
    ]
    network = [
        {"method": "GET", "url": "/index.html", "status": 200, "headers": {"content-type": "text/html"}, "body": "<html>...</html>"},
        {"method": "GET", "url": "/static/vault.js", "status": 200, "headers": {"content-type": "application/javascript"}, "body": "// vault module"},
        {"method": "GET", "url": "/api/ping", "status": 200,
         "headers": {"content-type": "application/json", "x-debug-flag": flag if place == "network" else "none"},
         "body": "{\"pong\":true}"},
        {"method": "POST", "url": "/api/login", "status": 401, "headers": {"content-type": "application/json"}, "body": "{\"error\":\"denied\"}"},
    ]
    return {"flag": flag, "place": place, "decoy": decoy,
            "public": {"tree": tree, "console": console, "network": network}}


def make_b1():
    key = rng.choice(content.VIG_KEYS)
    word = rng.choice(content.VIG_WORDS)
    return {"key": key, "plain": word, "cipher": vigenere(word, key)}


def make_b2():
    plain = rng.choice(content.DECODER_WORDS)
    raw = plain.encode()
    variant = rng.choice(["b64", "bin", "hexb64", "xor"])
    key = None
    if variant == "b64":
        encoded, steps = base64.b64encode(raw).decode(), ["base64"]
    elif variant == "bin":
        encoded, steps = " ".join(format(b, "08b") for b in raw), ["binary"]
    elif variant == "hexb64":
        encoded, steps = base64.b64encode(raw.hex().encode()).decode(), ["base64", "hex"]
    else:
        kb = rng.randint(1, 255)
        encoded, steps, key = bytes(b ^ kb for b in raw).hex(), ["hex", "xor"], format(kb, "02X")
    return {"plain": plain, "public": {"encoded": encoded, "steps": steps, "key": key}}


def make_l5():
    by = {r: [w["id"] for w in content.PASSWORDS if w["rung"] == r] for r in range(4)}
    ids = rng.sample(by[0], 2) + rng.sample(by[1], 1) + rng.sample(by[2], 1) + rng.sample(by[3], 1)
    rng.shuffle(ids)
    return {"ids": ids}


def make_l6():
    word = rng.choice(content.BIN_WORDS)
    return {"plain": word, "bits": [format(ord(c) - 64, "05b") for c in word]}


def make_l7():
    cols, rows = 12, 14
    n = cols * rows
    msg = rng.choice(content.HEX_MESSAGES)
    while True:
        idx = sorted(rng.sample(range(8, n - 8), len(msg)))
        if all(b - a >= 4 for a, b in zip(idx, idx[1:])):
            break
    secret = {i: format(ord(c), "02X") for i, c in zip(idx, msg)}
    free = [i for i in range(n) if i not in secret]
    decoys = set(rng.sample(free, 10))
    cells = []
    for i in range(n):
        if i in secret:
            cells.append({"v": secret[i], "k": 1})
        elif i in decoys:
            cells.append({"v": rng.choice(["00", "7F", "FF", "DE", "AD", "BE", "EF", "CA", "FE"]), "k": 2})
        else:
            cells.append({"v": "%02X" % rng.randint(0, 255), "k": 0})
    return {"plain": msg.replace(" ", ""), "public": {"cols": cols, "cells": cells}}


def make_l9():
    word = rng.choice(content.TERM_WORDS)
    variant = rng.choice(["b64", "hex"])
    encoded = base64.b64encode(word.encode()).decode() if variant == "b64" else word.encode().hex().upper()
    kind = "base64" if variant == "b64" else "hex"
    files = {
        "readme.txt": "Welcome, guest. The vault password is not gone, it is just hidden.\nDotfiles hide from a plain ls. Try the -a flag.",
        "notes.txt": "Admin reminder: I stored the vault key as %s so nobody reads it by accident.\nUse the decode command to turn it back into text." % kind,
        ".vault_key": encoded,
        "vault.enc": "[encrypted]  unlock it with: unlock vault.enc <password>",
    }
    return {"plain": word, "public": {"files": files, "hidden": [".vault_key"], "kind": kind}}


def make_l10():
    ids = rng.sample([e["id"] for e in content.SOCIAL], 5)
    perms, correct, cards = [], [], []
    for sid in ids:
        e = SOC[sid]
        perm = [0, 1, 2]
        rng.shuffle(perm)
        perms.append(perm)
        correct.append(perm.index(0))
        cards.append({"id": sid, "title": e["title"], "text": e["text"], "opts": [e["opts"][j] for j in perm]})
    return {"ids": ids, "correct": correct, "public": {"cards": cards}}


def unique_code():
    while True:
        code = "".join(rng.choice(CODE_ALPHABET) for _ in range(6))
        if not any(p["code"] == code for p in players.values()):
            return code


MAKERS = {"1": make_l1, "2": make_l2, "3": make_l3, "5": make_l5, "6": make_l6, "7": make_l7,
          "9": make_l9, "10": make_l10, "b1": make_b1, "b2": make_b2}


def ensure_player(p):
    """Fill in anything a player saved by an older version of the server is missing."""
    p.setdefault("opened", {})
    p.setdefault("tstamped", {})
    for k, f in MAKERS.items():
        if k not in p["ch"]:
            p["ch"][k] = f()


def new_player(nick):
    pid = secrets.token_hex(8)
    players[pid] = {
        "nick": nick, "code": unique_code(), "joined": time.time(),
        "solved": {}, "stamped": {}, "tstamped": {}, "attempts": {}, "hints": {}, "opened": {}, "last_try": 0,
        "ch": {k: f() for k, f in MAKERS.items()},
    }
    event("join", nick)
    return pid


# ------------------------------------------------------------------- state
def goal():
    return len(CORE4)


def solved_games(p):
    return [g for g in GAMES if g in p["solved"]]


def core_done(p):
    return all(g in p["solved"] for g in CORE4)


def stage(p):
    """0 = first three games, 1 = join the team, 2 = collect stamps, 3 = everything unlocked."""
    if not all(g in p["solved"] for g in CORE3):
        return 0
    if "4" not in p["solved"]:
        return 1
    if len(p["tstamped"]) < len(TRACKS):
        return 2
    return 3


def finished(p):
    return stage(p) >= 3


def unlocked(p):
    st = stage(p)
    if st == 0:
        return list(CORE3)
    if st < 3:
        return list(CORE4)
    return GAMES + BONUS


def level_start(p, level):
    t = p.get("opened", {}).get(level, p["joined"])
    return min(t, p["solved"].get(level, t))


def time_spent(p, level):
    return int(max(0, p["solved"][level] - level_start(p, level))) if level in p["solved"] else 0


def points(p):
    return sum(POINTS[l] for l in p["solved"])


def core_seconds(p):
    t = p.get("finished_at")
    if t is None:
        ts = [p["solved"][l] for l in GAMES if l in p["solved"]]
        t = max(ts) if ts else p["joined"]
    return int(max(0, t - p["joined"]))


def public_card(sid):
    s = SCEN[sid]
    return {k: s[k] for k in ("id", "channel", "sender_name", "addr", "reply_to", "subject", "link_target", "body")}


def public_challenges(p, unl):
    ch, out = p["ch"], {}
    if "1" in unl:
        out["1"] = {"cipher": ch["1"]["cipher"]}
    if "2" in unl:
        out["2"] = {"cards": [public_card(i) for i in ch["2"]["ids"]]}
    if "3" in unl:
        out["3"] = ch["3"]["public"]
    if "5" in unl:
        out["5"] = {"cards": [{"id": i, "pw": PWD[i]["pw"]} for i in ch["5"]["ids"]]}
    if "6" in unl:
        out["6"] = {"bits": ch["6"]["bits"]}
    if "7" in unl:
        out["7"] = ch["7"]["public"]
    if "9" in unl:
        out["9"] = ch["9"]["public"]
    if "10" in unl:
        out["10"] = ch["10"]["public"]
    if "b1" in unl:
        out["b1"] = {"cipher": ch["b1"]["cipher"], "key": ch["b1"]["key"]}
    if "b2" in unl:
        out["b2"] = ch["b2"]["public"]
    return out


def player_state(pid):
    p = players[pid]
    unl = unlocked(p)
    state = {
        "nickname": p["nick"], "code": p["code"],
        "solved": sorted(p["solved"]), "stamped": {k: {"leader": v["leader"], "ts": int(v["ts"])} for k, v in p["stamped"].items()},
        "unlocked": unl, "points": points(p), "goal": goal(), "finished": finished(p), "stage": stage(p), "core_done": core_done(p), "tracks": track_info(p),
        "challenges": public_challenges(p, unl),
    }
    if core_done(p):
        state["elapsed"] = core_seconds(p)
    return state


def throttled(p):
    now = time.time()
    if now - p.get("last_try", 0) < THROTTLE_SECONDS:
        return True
    p["last_try"] = now
    return False


def event(kind, nick, detail=""):
    EVENTS.append({"ts": time.strftime("%H:%M:%S"), "kind": kind, "nick": nick, "detail": detail})
    del EVENTS[:-40]


def mark_solved(p, level):
    now = time.time()
    fresh = level not in p["solved"]
    p["solved"].setdefault(level, now)
    if fresh:
        event("solve", p["nick"], "%s +%d" % (LEVEL_NAMES.get(level, level), POINTS.get(level, 0)))
    if core_done(p) and "finished_at" not in p:
        p["finished_at"] = now
        event("finish", p["nick"], "")


def bump(p, key, level):
    p[key][level] = p[key].get(level, 0) + 1


def normalize(s, spaces=False):
    s = clean_text(s, 80).upper()
    return s.replace(" ", "") if spaces else s


def flag_norm(value):
    """Forgiving flag compare: case, spaces, smart braces and the ITC{ } wrapper are ignored."""
    v = clean_text(value, 80).lower()
    for a, b in (("\u007b", "{"), ("\uff5b", "{"), ("\uff5d", "}"), ("\u201c", ""), ("\u201d", ""), ('"', ""), ("'", ""), ("`", "")):
        v = v.replace(a, b)
    v = "".join(v.split())
    if v.startswith("itc{") and v.endswith("}"):
        v = v[4:-1]
    return v


def check_answer(p, level, answer):
    ch = p["ch"]
    if level == "1":
        return normalize(answer) == ch["1"]["answer"]
    if level == "3":
        return flag_norm(answer) == flag_norm(ch["3"]["flag"])
    if level in ("6", "7", "9"):
        return normalize(answer, True) == ch[level]["plain"]
    if level == "b1":
        return normalize(answer, True) == ch["b1"]["plain"]
    if level == "b2":
        return normalize(answer, True) == ch["b2"]["plain"]
    return False


def hint_params(p, level, n):
    ch = p["ch"]
    if level == "1" and n >= 3:
        return {"k": ch["1"]["k"]}
    if level == "3" and n >= 2:
        return {"tab": ch["3"]["place"]}
    if level in ("6", "7", "9") and n >= 3:
        return {"first": ch[level]["plain"][0]}
    if level == "b1" and n >= 2:
        return {"first": ch["b1"]["plain"][0]}
    if level == "b2" and n >= 2:
        return {"steps": ch["b2"]["public"]["steps"]}
    return {}


# ------------------------------------------------------------------- stamps
def apply_stamp(p, level, leader, method):
    if level not in GAMES:
        return None, "Unknown game."
    if level not in p["solved"]:
        return None, "This operator has not solved level %s yet." % level
    if level in p["stamped"]:
        return None, "Level %s is already stamped (by %s)." % (level, p["stamped"][level]["leader"])
    now = time.time()
    p["stamped"][level] = {"leader": leader, "ts": now, "method": method}
    append_csv(STAMPS_FILE, STAMP_HEADER, [
        time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(now)), p["code"], p["nick"], leader, method,
        level, LEVEL_NAMES[level], time_spent(p, level), p["attempts"].get(level, 0), p["hints"].get(level, 0)])
    save_players()
    return True, None


def track_info(p):
    out = {}
    for t, games in TRACKS.items():
        got = [g for g in games if g in p["solved"]]
        st = p["tstamped"].get(t)
        out[t] = {"games": games, "solved": got, "ready": bool(got) and not st,
                  "stamp": {"leader": st["leader"], "ts": int(st["ts"])} if st else None}
    return out


def apply_track_stamp(p, track, leader, method):
    if track not in TRACKS:
        return None, "Unknown stamp."
    if track in p["tstamped"]:
        return None, "%s is already stamped (by %s)." % (track.title(), p["tstamped"][track]["leader"])
    got = [g for g in TRACKS[track] if g in p["solved"]]
    if not got:
        return None, "This operator has not solved a %s game yet." % track.title()
    for g in got:
        if g not in p["stamped"]:
            apply_stamp(p, g, leader, method)
    p["tstamped"][track] = {"leader": leader, "ts": time.time()}
    event("stamp", p["nick"], track.upper())
    save_players()
    return True, None


def find_leader(pin):
    pin = clean_text(pin, 20)
    found = None
    for l in leaders:  # constant-time compare, no early exit
        if hmac.compare_digest(pin.encode(), str(l["pin"]).encode()):
            found = l
    return found


def player_by_code(code):
    code = clean_text(code, 40).upper().replace("ITC-BT:", "").replace(" ", "")
    for pid, p in players.items():
        if p["code"] == code:
            return pid, p
    return None, None


def local_ips():
    ips = set()
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ips.add(info[4][0])
    except OSError:
        pass
    probe = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        probe.connect(("10.255.255.255", 1))
        ips.add(probe.getsockname()[0])
    except OSError:
        pass
    finally:
        probe.close()
    return sorted(ip for ip in ips if not ip.startswith("127."))


# ------------------------------------------------------------------ reports
def leaderboard():
    rows, done = [], 0
    for p in players.values():
        if not p["solved"]:
            continue
        core = solved_games(p)
        if core_done(p):
            done += 1
        last = p.get("finished_at") or max(p["solved"].values())
        rows.append({"nickname": p["nick"], "points": points(p), "levels": len(core), "stamps": len(p["tstamped"]),
                     "seconds": int(last - p["joined"]), "elite": all(b in p["solved"] for b in BONUS)})
    rows.sort(key=lambda r: (-r["points"], r["seconds"]))
    return {"top": rows[:12], "players": len(players), "finished": done, "goal": goal(), "events": EVENTS[-14:][::-1]}


def stats():
    per = {}
    for l in CORE + BONUS:
        solved = [p for p in players.values() if l in p["solved"]]
        n = len(solved)
        per[l] = {
            "solved": n, "stamped": sum(1 for p in players.values() if l in p["stamped"]),
            "avg_seconds": round(sum(time_spent(p, l) for p in solved) / n) if n else 0,
            "avg_attempts": round(sum(p["attempts"].get(l, 0) for p in solved) / n, 1) if n else 0,
            "avg_hints": round(sum(p["hints"].get(l, 0) for p in solved) / n, 1) if n else 0,
        }
    by_leader = {}
    if STAMPS_FILE.exists():
        with STAMPS_FILE.open(newline="", encoding="utf-8") as fh:
            for r in csv.DictReader(fh):
                by_leader[r["leader"]] = by_leader.get(r["leader"], 0) + 1
    signups = 0
    if SIGNUPS_FILE.exists():
        with SIGNUPS_FILE.open(newline="", encoding="utf-8") as fh:
            signups = max(0, sum(1 for _ in fh) - 1)
    return {"players": len(players), "finished": leaderboard()["finished"], "signups": signups,
            "levels": per, "by_leader": by_leader}


def players_csv():
    buf = io.StringIO()
    w = csv.writer(buf)
    head = ["operator_code", "nickname", "points", "core_seconds", "stamps"]
    for l in CORE + BONUS:
        head += ["L%s_seconds" % l, "L%s_attempts" % l, "L%s_hints" % l]
    w.writerow(head)
    for p in sorted(players.values(), key=lambda x: -points(x)):
        row = [p["code"], p["nick"], points(p), core_seconds(p), len(p["stamped"])]
        for l in CORE + BONUS:
            row += [time_spent(p, l) if l in p["solved"] else "", p["attempts"].get(l, 0), p["hints"].get(l, 0)]
        w.writerow([csv_safe(str(x)) for x in row])
    return buf.getvalue()


def read_log(n=25):
    if not STAMPS_FILE.exists():
        return []
    with STAMPS_FILE.open(newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))[-n:][::-1]


# ------------------------------------------------------------------ handler
class Handler(BaseHTTPRequestHandler):
    server_version = "BreachTrail/2.0"

    def _send(self, code, body, ctype, cache="no-store", html=False):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if html:
            self.send_header("Content-Security-Policy", CSP)
        self.end_headers()
        self.wfile.write(body)

    def _json(self, code, obj):
        self._send(code, json.dumps(obj, ensure_ascii=False), "application/json; charset=utf-8")

    def _err(self, code, msg):
        self._json(code, {"error": msg})

    def _static(self, rel):
        f = PUBLIC / rel
        if not f.is_file():
            return self._send(404, "Missing file: " + rel, "text/plain; charset=utf-8")
        ext = f.suffix.lower()
        st = f.stat()
        etag = '"%x-%x"' % (int(st.st_mtime), st.st_size)
        cache = "public, max-age=604800, immutable" if ext == ".woff2" else "no-cache"
        if self.headers.get("If-None-Match") == etag:
            self.send_response(304)
            self.send_header("ETag", etag)
            self.send_header("Cache-Control", cache)
            self.end_headers()
            return
        data = f.read_bytes()
        gz = False
        if ext in (".js", ".css", ".html", ".svg", ".webmanifest") and "gzip" in self.headers.get("Accept-Encoding", ""):
            key = (str(f), etag)
            if key not in GZ_CACHE:
                GZ_CACHE[key] = gzip.compress(data, 6)
            data, gz = GZ_CACHE[key], True
        ctype = CTYPES.get(ext, "application/octet-stream")
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", cache)
        self.send_header("ETag", etag)
        self.send_header("Vary", "Accept-Encoding")
        if gz:
            self.send_header("Content-Encoding", "gzip")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Referrer-Policy", "no-referrer")
        if ext == ".html":
            self.send_header("Content-Security-Policy", CSP)
        self.end_headers()
        self.wfile.write(data)

    def _read_json(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except ValueError:
            return None
        if length <= 0 or length > MAX_BODY:
            return None
        try:
            data = json.loads(self.rfile.read(length).decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            return None
        return data if isinstance(data, dict) else None

    def _leader(self):
        auth = self.headers.get("Authorization", "")
        token = auth[7:] if auth.startswith("Bearer ") else ""
        with LOCK:
            now = time.time()
            for t in [t for t, v in leader_tokens.items() if v["exp"] < now]:
                del leader_tokens[t]
            return leader_tokens.get(token)

    # ---------------- GET
    def do_GET(self):
        url = urlparse(self.path)
        path = url.path
        if path in STATIC:
            return self._static(STATIC[path])
        m = FONT_RE.match(path)
        if m:
            return self._static("fonts/" + m.group(1))
        if path == "/api/me":
            pid = parse_qs(url.query).get("id", [""])[0]
            with LOCK:
                if pid not in players:
                    return self._err(404, "Unknown player.")
                return self._json(200, player_state(pid))
        if path == "/api/leaderboard":
            with LOCK:
                return self._json(200, leaderboard())
        if path.startswith("/api/leader/"):
            return self._leader_get(path, parse_qs(url.query))
        return self._err(404, "Not found.")

    def _leader_get(self, path, query):
        who = self._leader()
        if not who:
            return self._err(401, "Sign in first.")
        with LOCK:
            if path == "/api/leader/lookup":
                pid, p = player_by_code(query.get("code", [""])[0])
                if not p:
                    return self._err(404, "No operator with that code.")
                return self._json(200, {"code": p["code"], "nickname": p["nick"], "solved": sorted(p["solved"]),
                                        "stamped": {k: v["leader"] for k, v in p["stamped"].items()}, "tracks": track_info(p), "points": points(p), "level": len(solved_games(p))})
            if path == "/api/leader/log":
                return self._json(200, {"rows": read_log()})
            if path == "/api/leader/stats":
                return self._json(200, stats())
            if path == "/api/leader/export":
                kind = query.get("kind", [""])[0]
                if kind == "stamps":
                    data = STAMPS_FILE.read_text(encoding="utf-8") if STAMPS_FILE.exists() else ",".join(STAMP_HEADER) + "\n"
                    return self._send(200, data, "text/csv; charset=utf-8")
                if not who["admin"]:
                    return self._err(403, "Only the lead can export this.")
                if kind == "players":
                    return self._send(200, players_csv(), "text/csv; charset=utf-8")
                if kind == "signups":
                    data = SIGNUPS_FILE.read_text(encoding="utf-8") if SIGNUPS_FILE.exists() else ",".join(SIGNUP_HEADER) + "\n"
                    return self._send(200, data, "text/csv; charset=utf-8")
                return self._err(400, "Unknown export.")
        return self._err(404, "Not found.")

    # ---------------- POST
    def do_POST(self):
        path = urlparse(self.path).path
        body = self._read_json()
        if body is None:
            return self._err(400, "Bad request.")
        if path == "/api/leader/login":
            return self._login(body)
        if path == "/api/leader/logout":
            auth = self.headers.get("Authorization", "")
            with LOCK:
                leader_tokens.pop(auth[7:], None)
            return self._json(200, {"ok": True})
        if path == "/api/leader/stamp":
            return self._leader_stamp(body)
        if path == "/api/join":
            nick = clean_text(body.get("nickname"), 20)
            if len(nick) < 2:
                return self._err(400, "Nickname must be 2 to 20 characters.")
            with LOCK:
                pid = new_player(nick)
                save_players()
                state = player_state(pid)
            state["id"] = pid
            return self._json(200, state)
        return self._player_post(path, body)

    def _login(self, body):
        ip = self.client_address[0]
        with LOCK:
            fails = login_fails.get(ip, [0, 0])
            if fails[1] > time.time():
                return self._err(429, "Too many tries. Wait a minute.")
            who = find_leader(body.get("pin"))
            if not who:
                fails[0] += 1
                if fails[0] >= LOGIN_MAX_FAILS:
                    fails = [0, time.time() + LOGIN_LOCK_SECONDS]
                login_fails[ip] = fails
                return self._err(401, "Wrong PIN.")
            login_fails.pop(ip, None)
            token = secrets.token_hex(24)
            leader_tokens[token] = {"name": who["name"], "admin": bool(who.get("admin")), "exp": time.time() + TOKEN_TTL}
        return self._json(200, {"token": token, "name": who["name"], "admin": bool(who.get("admin"))})

    def _leader_stamp(self, body):
        who = self._leader()
        if not who:
            return self._err(401, "Sign in first.")
        raw = body.get("levels")
        levels = [str(x) for x in raw] if isinstance(raw, list) else [str(body.get("level"))]
        levels = [l for i, l in enumerate(levels) if l not in levels[:i]][:4]
        tracks = body.get("tracks")
        method = "scan" if body.get("method") == "scan" else "manual"
        with LOCK:
            pid, p = player_by_code(body.get("code", ""))
            if not p:
                return self._err(404, "No operator with that code.")
            done, skipped = [], {}
            if isinstance(tracks, list):
                for t in [str(x) for x in tracks][:3]:
                    ok, err = apply_track_stamp(p, t, who["name"], method)
                    if ok:
                        done.append(t)
                    else:
                        skipped[t] = err
                if not done:
                    return self._err(409, next(iter(skipped.values()), "Nothing to stamp."))
                return self._json(200, {"nickname": p["nick"], "done": done, "skipped": skipped, "tracks": track_info(p)})
            for level in levels:
                ok, err = apply_stamp(p, level, who["name"], method)
                if ok:
                    done.append(level)
                else:
                    skipped[level] = err
            if not done:
                return self._err(409, next(iter(skipped.values()), "Nothing to stamp."))
            return self._json(200, {"nickname": p["nick"], "level": done[0], "done": done, "skipped": skipped, "stamped": sorted(p["stamped"])})

    def _player_post(self, path, body):
        pid = body.get("id")
        with LOCK:
            if not isinstance(pid, str) or pid not in players:
                return self._err(404, "Unknown player. Reload the page and start again.")
            p = players[pid]
            unl = unlocked(p)

            if path == "/api/answer":
                level = str(body.get("level"))
                if level not in ("1", "3", "6", "7", "9", "b1", "b2"):
                    return self._err(400, "Bad level.")
                if level not in unl:
                    return self._err(403, "That level is locked.")
                if level in p["solved"]:
                    return self._json(200, {"correct": True, **player_state(pid)})
                if throttled(p):
                    return self._err(429, "Slow down a little.")
                bump(p, "attempts", level)
                ok = check_answer(p, level, body.get("answer"))
                if ok:
                    mark_solved(p, level)
                save_players()
                return self._json(200, {"correct": ok, **player_state(pid)})

            if path == "/api/phish":
                picks = body.get("picks")
                ids = p["ch"]["2"]["ids"]
                if "2" not in unl:
                    return self._err(403, "That level is locked.")
                if not (isinstance(picks, list) and len(picks) == len(ids) and all(isinstance(x, bool) for x in picks)):
                    return self._err(400, "Answer all six cards.")
                if "2" in p["solved"]:
                    return self._json(200, {"pass": True, "score": len(ids), "total": len(ids), "wrong": [], **player_state(pid)})
                if throttled(p):
                    return self._err(429, "Slow down a little.")
                bump(p, "attempts", "2")
                wrong = [i for i, sid in enumerate(ids) if picks[i] != SCEN[sid]["fake"]]
                score = len(ids) - len(wrong)
                passed = score >= PASS_SCORE
                out = {"score": score, "total": len(ids), "pass": passed, "wrong": wrong}
                if passed:
                    mark_solved(p, "2")
                    out["review"] = [{"id": sid, "fake": SCEN[sid]["fake"], "why": SCEN[sid]["why"]} for sid in ids]
                save_players()
                return self._json(200, {**out, **player_state(pid)})

            if path == "/api/open":
                level = str(body.get("level"))
                if level in unl:
                    p["opened"].setdefault(level, time.time())
                    save_players()
                return self._json(200, {"ok": True})

            if path == "/api/quiz":
                level = str(body.get("level"))
                picks = body.get("picks")
                if level not in ("5", "10"):
                    return self._err(400, "Bad game.")
                ids = p["ch"][level]["ids"]
                if not (isinstance(picks, list) and len(picks) == len(ids) and all(isinstance(x, int) and not isinstance(x, bool) and 0 <= x <= 3 for x in picks)):
                    return self._err(400, "Answer every card.")
                if level in p["solved"]:
                    return self._json(200, {"pass": True, "score": len(ids), "total": len(ids), "wrong": [], **player_state(pid)})
                if throttled(p):
                    return self._err(429, "Slow down a little.")
                bump(p, "attempts", level)
                if level == "5":
                    truth = [PWD[i]["rung"] for i in ids]
                else:
                    truth = p["ch"]["10"]["correct"]
                wrong = [i for i in range(len(ids)) if picks[i] != truth[i]]
                score = len(ids) - len(wrong)
                passed = score >= QUIZ_PASS
                out = {"score": score, "total": len(ids), "pass": passed, "wrong": wrong}
                if passed:
                    mark_solved(p, level)
                    if level == "5":
                        out["review"] = [{"id": i, "rung": PWD[i]["rung"], "why": PWD[i]["why"]} for i in ids]
                    else:
                        out["review"] = [{"id": i, "correct": truth[k], "why": SOC[i]["why"]} for k, i in enumerate(ids)]
                save_players()
                return self._json(200, {**out, **player_state(pid)})

            if path == "/api/hint":
                level = str(body.get("level"))
                if level not in GAMES + BONUS or level not in unl:
                    return self._err(400, "Bad level.")
                bump(p, "hints", level)
                save_players()
                n = p["hints"][level]
                return self._json(200, {"n": n, "params": hint_params(p, level, n)})

            if path == "/api/signup":
                if "4" not in unl:
                    return self._err(403, "Finish the first three games first.")
                if "4" in p["solved"]:
                    return self._json(200, player_state(pid))
                name = clean_text(body.get("name"), 60)
                year = clean_text(body.get("year"), 30)
                field = clean_text(body.get("field"), 60)
                role = clean_text(body.get("role"), 20)
                learn = clean_text(body.get("learn"), 120)
                contact = clean_text(body.get("contact"), 80)
                if len(name) < 2 or len(contact) < 3:
                    return self._err(400, "Add your name and a way to reach you.")
                if role not in ROLES or year not in YEARS:
                    return self._err(400, "Choose your year and a role.")
                if body.get("consent") is not True:
                    return self._err(400, "Please tick the box so we can contact you.")
                bump(p, "attempts", "4")
                append_csv(SIGNUPS_FILE, SIGNUP_HEADER, [
                    time.strftime("%Y-%m-%d %H:%M:%S"), p["code"], p["nick"], name, year, field, role, learn, contact])
                mark_solved(p, "4")
                save_players()
                return self._json(200, player_state(pid))

            if path == "/api/station-stamp":
                level = str(body.get("level"))
                if level not in GAMES:
                    return self._err(400, "Bad game.")
                if throttled(p):
                    return self._err(429, "Slow down a little.")
                pin = clean_text(body.get("pin"), 10)
                expected = str(config["station_pins"].get(level, ""))
                if not expected or not hmac.compare_digest(pin.encode(), expected.encode()):
                    return self._err(401, "Wrong station PIN.")
                ok, err = apply_track_stamp(p, TRACK_OF[level], "Station L" + level, "station")
                if not ok:
                    return self._err(409, err)
                return self._json(200, player_state(pid))
        return self._err(404, "Not found.")

    def log_message(self, fmt, *args):
        line = args[0] if args else ""
        if "/api/leaderboard" in line or "/fonts/" in line:
            return
        super().log_message(fmt, *args)


def make_self_signed():
    """Create data/selfsigned.pem + selfsigned.key with openssl (if installed). Returns (cert, key) or None."""
    cert, key = DATA / "selfsigned.pem", DATA / "selfsigned.key"
    if cert.exists() and key.exists():
        return cert, key
    import shutil
    import subprocess
    if not shutil.which("openssl"):
        return None
    san = ",".join(["DNS:localhost", "IP:127.0.0.1"] + ["IP:" + ip for ip in local_ips()])
    try:
        subprocess.run(["openssl", "req", "-x509", "-newkey", "rsa:2048", "-nodes", "-days", "30", "-keyout", str(key), "-out", str(cert),
                        "-subj", "/CN=itc-breach-trail", "-addext", "subjectAltName=" + san],
                       check=True, capture_output=True, timeout=60)
    except Exception:
        return None
    return cert, key


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "8080"))
    init_data()
    server = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    scheme = "http"
    cert, key = BASE / "cert.pem", BASE / "key.pem"
    secure_port = None
    if cert.exists() and key.exists():
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.load_cert_chain(str(cert), str(key))
        server.socket = ctx.wrap_socket(server.socket, server_side=True)
        scheme = "https"
    else:
        pair = make_self_signed()
        if pair:
            try:
                secure_port = port + 363
                sserver = ThreadingHTTPServer(("0.0.0.0", secure_port), Handler)
                ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
                ctx.load_cert_chain(str(pair[0]), str(pair[1]))
                sserver.socket = ctx.wrap_socket(sserver.socket, server_side=True)
                threading.Thread(target=sserver.serve_forever, daemon=True).start()
            except Exception:
                secure_port = None
    print("\n  ITC // RED TEAM . BREACH TRAIL (%s)\n" % scheme.upper())
    print("  Visitors open one of these after joining your hotspot:")
    for ip in local_ips():
        print(f"    {scheme}://{ip}:{port}")
    print(f"\n  Leader portal   : {scheme}://localhost:{port}/leader")
    if secure_port:
        print("  Leaders on phones (camera scan works here; accept the browser warning once):")
        for ip in local_ips():
            print(f"    https://{ip}:{secure_port}/leader")
    else:
        print("  (No HTTPS: the camera is off. Leaders can use the photo button or type the code.)")
    print(f"  Big screen board: {scheme}://localhost:{port}/board")
    print("\n  Leader PINs (keep private):")
    for l in leaders:
        print("    %-10s %s%s" % (l["name"], l["pin"], "   (lead: can export)" if l.get("admin") else ""))
    print("\n  Station PINs (print one per table):")
    names = {"1": "Crack the Code", "2": "Spot the Phish", "3": "Find the Flag", "4": "Join the Team", "5": "Password Smash",
             "6": "Binary Name", "7": "Hidden Wall", "9": "Terminal Escape", "10": "Social Engineer"}
    for n in GAMES:
        print(f"    {names[n]:<16}: {config['station_pins'].get(n)}")
    print("\n  Flow: games 1-3, then Join the Team, then stamps (3 tracks), then every other game and the Advanced Lab unlock.")
    print("\n  Stamps stream to data/stamps.csv. Press Ctrl+C to stop.\n")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")


if __name__ == "__main__":
    main()
