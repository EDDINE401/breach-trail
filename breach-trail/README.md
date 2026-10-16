# ITC // Red Team: Breach Trail (v2, mobile-first PWA)

Python 3 only. No pip installs, no internet needed at the stand.

## Run
    python3 server.py            # port 8080 by default, or: python3 server.py 9000

1. Turn on your PC hotspot and start the server.
2. The console prints the address to give visitors (e.g. http://192.168.137.1:8080), the leader PINs and one station PIN per level.
3. Put a QR code of that address on the stand table (any QR generator).

Pages
- `/`        player game (English / Arabic, switch with the chip at the top)
- `/leader`  leader portal: PIN login, scan QR or type operator code, stamp a level, log, stats, CSV export
- `/board`   big screen live leaderboard (open it full screen on a laptop or TV)

## Digital stamp workflow (no paper)
- Three stamps: MOTIVATED (Flag, Terminal, Password), GENIUS (Code, Beads, Hex), POSITIVE (Phish, Team, Social). A stamp becomes READY when the player solves any game in its track.
- The player opens Passport > SHOW VICTORY QR (or the fingerprint button). A leader opens `/leader`, signs in with the keypad PIN, scans the QR (or photographs it, or types the 6-character code), ticks the ready stamps and taps STAMP SELECTED.
- The stamp lands live on the player's screen (the phone checks every 5 s, only while a stamp is waiting). No PIN on the player side.
- Stamps never block play. Station PINs still exist in `data/config.json` (API only, no UI) for emergencies.

## Data usage
The app makes no external requests. Static files are gzipped and revalidated with ETag (304), fonts cache for a week, the leaderboard refreshes every 5 s. If your router has a SIM, phones on its Wi-Fi can still burn that SIM with background traffic: turn the router's mobile data (Flow Switch) off or remove the SIM.

## Staged flow
1. Only games 1, 2, 3 (Crack the Code, Spot the Phish, Find the Flag) are open.
2. After all three, "Join the Team" (game 4) opens.
3. After joining, the player opens Passport and shows the victory QR. Staff stamp all 3 tracks in the leader portal.
4. When all 3 stamps land, games 5, 6, 7, 9, 10 and the Advanced Lab (b1, b2) unlock, with free choice from then on.
Each game is worth 100 points, bonus labs 75. The leaderboard "finished" count means the first four are solved.

## Games
1 Caesar wheel, 2 Spot the Phish (swipe, brands: Progres, MyOoredoo, BADR Bank), 3 DevTools flag hunt, 4 join-the-team form, 5 Smash the Password (rank 5 passwords), 6 Bead Decoder (binary to letters), 7 Hex Wall (bright red bytes to ASCII), 9 Escape the Terminal (fake shell: ls -a, decode, unlock), 10 Social Engineer (5 scenes). Secret Handshake and Hacker Bingo stay physical. Every player gets different content; answers are checked only on the server.

## No internet needed
The app is fully offline (fonts, QR and camera libs are bundled). A phone hotspot with mobile data OFF works. Phones may say "no internet": tap "stay connected". Open the app by IP address (shown at start). Live camera and the service worker need the HTTPS address (auto self-signed); otherwise use the photo button.

## Data (folder `data/`, created on first run)
- `stamps.csv`  audit stream: timestamp, operator_code, nickname, leader, method, level, level_name, time_spent_s, attempts, hints_used
- `signups.csv` people who want to join (personal data: keep private, delete after use)
- `players.json`, `leaders.json` (edit names/PINs/admin flag), `config.json` (station PINs, require_stamp)
Exports: `/leader` > Export tab. Stamp log for every leader; players and sign-ups for the lead only.

## Leader camera, offline mode and HTTPS
Browsers only allow the live camera and offline caching on HTTPS. At startup the server (if `openssl` is installed) also opens a second, HTTPS address on port+363 (default 8443) and prints it:

    Leaders on phones (camera scan works here; accept the browser warning once):
      https://192.168.x.x:8443/leader

- Leaders open that address in Chrome/Safari, tap Advanced > Proceed once (self-signed certificate), then the SCAN QR button works. Players keep using the normal http address.
- If HTTPS is not available (no openssl, or the warning is blocked) the portal shows TAKE PHOTO OF QR. It opens the phone camera app, takes a picture of the player's QR and reads it. This works on plain http. Typing the 6-character code always works too.
- You can use your own certificate instead: put `cert.pem` and `key.pem` next to `server.py` (for example from `mkcert`) and the whole site runs on HTTPS.
- Stamping: after a lookup, every solved and not yet stamped level is pre-ticked. Untick any you do not want, then tap STAMP SELECTED to stamp several levels at once.

## Security notes
- Keep leader PINs private. 5 wrong PINs from one device locks it for 60 seconds. Leader sessions last 12 hours.
- Do not expose the server beyond the hotspot.
- Third-party code and fonts are listed in THIRD-PARTY.md.
