# Home WiFi Collector

Feeds **real** data to the Command Center's Home WiFi Monitor. The website runs
in the cloud and can't see your home network on its own — this small script runs
**on your home network** and pushes metadata up to the site.

It's metadata only: which devices are on the WiFi, their vendor/type, and (if
you run Pi-hole/AdGuard) which domains were queried. It never sees message
contents, call audio, or anything inside an encrypted connection.

## What you need

- An always-on machine on your home WiFi: a spare laptop, a **Raspberry Pi**, a
  NAS — anything that runs **Node 18+**.
- (Best, optional) a **Pi-hole** or **AdGuard Home** on your network for
  domain-level activity and ad/tracker blocking. Without it you still get the
  full device list and presence (who's home / when they left), just not domains.

## Server setup (once)

1. **Run the migration** `supabase/migrations/009_wifi_live.sql` on your Supabase
   project (SQL editor, or `supabase db push`).
2. **Set a secret** on the site (Vercel → Project → Settings → Environment
   Variables): `WIFI_INGEST_SECRET` = a long random string. Redeploy.

Until this is done the dashboard just shows sample data (badged **SAMPLE**).

## Fastest: one-command install (recommended)

On the home machine (Raspberry Pi / spare laptop / NAS), run:

```bash
curl -fsSL https://raw.githubusercontent.com/jamiejay214/text2sale/main/collector/install.sh | bash
```

It clones the repo if needed, checks Node, asks for your `SITE_URL` and
`WIFI_INGEST_SECRET` (and optional Pi-hole), runs one test cycle, then installs
the collector as a **background service that auto-starts on boot** (systemd on
Linux, launchd on macOS). Pre-set the env vars to skip the prompts:

```bash
SITE_URL="https://text2sale.com" WIFI_INGEST_SECRET="..." \
  bash -c "$(curl -fsSL https://raw.githubusercontent.com/jamiejay214/text2sale/main/collector/install.sh)"
```

## Or run it manually

```bash
cd collector
SITE_URL="https://text2sale.com" \
WIFI_INGEST_SECRET="the-same-secret-you-set-on-the-server" \
node collect.mjs
```

Open **text2sale.com/command → Home WiFi**. Within a minute the badge flips to
**LIVE** and your real devices appear. Rename them and assign owners with the
**✎ Edit devices** button.

### With Pi-hole (adds domains, apps, blocking)

```bash
SITE_URL="https://text2sale.com" \
WIFI_INGEST_SECRET="..." \
PIHOLE_URL="http://192.168.1.10" \
PIHOLE_TOKEN="your-pihole-api-token" \
node collect.mjs
```

(AdGuard Home users: set `AGH_URL`, `AGH_USER`, `AGH_PASS` instead — hook is
stubbed in `piholeDomains` for you to fill in.)

## Keep it running

**systemd (Linux / Raspberry Pi):** create `/etc/systemd/system/wifi-collector.service`:

```ini
[Unit]
Description=Home WiFi Collector
After=network-online.target

[Service]
Environment=SITE_URL=https://text2sale.com
Environment=WIFI_INGEST_SECRET=your-secret
Environment=PIHOLE_URL=http://192.168.1.10
Environment=PIHOLE_TOKEN=your-token
ExecStart=/usr/bin/node /home/pi/text2sale/collector/collect.mjs
Restart=always

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now wifi-collector
journalctl -u wifi-collector -f
```

**cron (run once per minute):** set `INTERVAL_SEC=0` and add
`* * * * * SITE_URL=... WIFI_INGEST_SECRET=... node /path/collect.mjs`.

## Environment variables

| Var | Required | Default | Notes |
| --- | --- | --- | --- |
| `SITE_URL` | ✅ | — | Your site, e.g. `https://text2sale.com` |
| `WIFI_INGEST_SECRET` | ✅ | — | Must match the server env var |
| `SUBNET` | | guessed | e.g. `192.168.1` |
| `INTERVAL_SEC` | | `60` | `0` = run once and exit (for cron) |
| `HOUSEHOLD` | | `home` | Label if you monitor more than one home |
| `PIHOLE_URL` / `PIHOLE_TOKEN` | | — | Pi-hole for domain activity |
| `STATE_FILE` | | `./.wifi-state.json` | Tracks first-seen + presence across runs |

## Notes & limits

- **Accuracy of presence** depends on ARP; phones that sleep can briefly look
  offline. The dashboard tolerates this, but you can lengthen `INTERVAL_SEC`.
- **Randomized MACs**: modern phones rotate their MAC per network. On your own
  network the MAC is stable once joined, so devices stay recognizable.
- **Device type/owner** are best-guessed from hostname/vendor; fix them in the
  dashboard (they persist).
- Run this only on a network you own, and use it openly with your family.
