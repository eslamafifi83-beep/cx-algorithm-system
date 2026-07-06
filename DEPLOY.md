# Deploying The CX Algorithm website — plan & options

*Written for Dr Eslam Afifi. Prices are approximate and change often — always check the provider's current pricing.*

---

## 0. The one fact that decides everything

Your site is **not** a plain static website. It's a small Node.js program (`server.js`) that **saves files while it runs**:

- The hidden `/admin` panel edits `content.json`
- Uploads are written to `assets/uploads/` (images) and `assets/media/` (audio/video)
- The contact form saves to `messages.json`

So whatever you host it on must (a) run a live Node process and (b) **keep the files you write** across restarts. Hosts that wipe the disk on every restart (most "serverless" / free tiers) will silently erase everything you upload through the admin. That single requirement rules out the tempting free static hosts and shapes every option below.

You do **not** need to rebuild the site — it's finished. The only question is *where it lives*.

---

## 1. The realistic options

| Option | Rebuild by Claude? | Rough monthly cost | Effort for you | Notes |
|---|---|---|---|---|
| **A. Vercel + Supabase** | Yes (back-end rewrite) | **~Free** | Medium (4 accounts) | Most professional & scalable. Your original idea. |
| **B. Render** | No (runs as-is) | ~$7 | Low (~20 min) | Cheapest "ship what we have." Persistent disk. |
| **C. Replit (Reserved VM)** | No (runs as-is) | ~$20 | Lowest (one dashboard) | Most beginner-friendly, priciest, some lock-in. |
| **D. Cheap VPS** (Hetzner/DO) | No | ~$5 | Higher (server setup) | Cheapest run-as-is, most control, most hands-on. |

All four give you HTTPS and a custom domain. All four solve the "keep my files" problem (A via cloud storage, B/C/D via a persistent disk).

### Which I'd pick
- **Want free + future-proof, and happy for me to spend build time:** **Option A (Vercel + Supabase).**
- **Want live this week, cheap, minimal change:** **Option B (Render).**
- **Want everything in one simple dashboard and $20/mo is fine:** **Option C (Replit).**
- **Comfortable with a little server admin, want cheapest:** **Option D (VPS).**

There is no wrong choice — it's a convenience-vs-cost-vs-build-time trade.

---

## 2. Before you go live — security checklist (applies to ALL options)

These must happen regardless of host:

1. **Change the admin password.** It's currently hardcoded as `cxalgorithm2026` in `server.js`. Before launch I'll move the username + password into **environment variables** (secrets you set in the host's dashboard, never in the code). Pick a strong password.
2. **HTTPS on.** Every option above provides free HTTPS — required, because the admin login sends your password and it must be encrypted.
3. **Keep `messages.json` and `server.js` private.** Already handled — the server returns 404 for them — but worth re-checking after deploy.
4. **Back up your content.** `content.json` + the `assets/uploads` / `assets/media` folders are your whole site's data. Whatever host we pick, I'll set up a simple backup (or, in Option A, Supabase keeps it for you).

---

## 3. Domain & email (you don't own a domain yet)

**Domain (~$10–15/year):**
- Register it (e.g. `thecxalgorithm.com`) — I recommend **Cloudflare Registrar** (sells at cost, no markup) or Namecheap/Porkbun.
- Then point it at your host with a couple of DNS records — I'll give you the exact values once we pick a host.

**Email at your domain** (`hello@thecxalgorithm.com`) — two levels:
- **Free:** Cloudflare **Email Routing** forwards `hello@thecxalgorithm.com` → your normal Gmail inbox. Costs nothing. Good enough to *receive* enquiries.
- **Paid (~$6–7/mo):** **Google Workspace** gives a real Gmail inbox that also *sends* from your domain address. Worth it only if you want to email people *from* `hello@thecxalgorithm.com`.
- Start free; upgrade later if you want.

---

## 4. Step-by-step per option

### Option A — Vercel + Supabase (free, professional; needs a back-end rebuild)

*Your original diagram. Best long-term value. The pages look identical; the plumbing moves to the cloud.*

What changes under the hood:

| Today (files on disk) | New home |
|---|---|
| `content.json` | Supabase database table |
| `messages.json` | Supabase database table |
| `assets/uploads/`, `assets/media/` | Supabase Storage (with CDN) |
| `server.js` API routes | Vercel serverless functions (`/api/...`) |
| Admin password | Supabase Auth or an admin secret in Vercel |

**Phases:**
1. **Supabase foundation** *(you: create a free Supabase account; me: everything else)* — I create the database tables + storage buckets and load your current content into them.
2. **Rewire the app** *(me)* — convert `server.js` into Vercel functions, point the admin + pages at Supabase, set up **direct browser→Supabase uploads** for big media (Vercel can't accept large files directly), and wire admin login. Tested locally.
3. **Go live** *(you click, I guide)* — push to GitHub → connect Vercel (auto-deploys on every change) → register domain → Cloudflare DNS → optional email.

**Two caveats for this option:**
- **Big video/audio** must upload **straight to Supabase Storage from your browser** (Vercel functions cap uploads at a few MB). I'll build that. For video, the **Spotify-embed** route is still smarter than self-hosting.
- **Vercel's free "Hobby" tier is for non-commercial use.** A personal podcast is generally fine, but if you add paid sponsorships/sales later, Vercel expects the Pro plan (~$20/mo). Supabase free tier pauses a project after ~1 week of no traffic (wakes on next visit) — a live site with visitors won't hit this; Pro (~$25/mo) removes it entirely if it ever matters.

**Your recurring cost:** ~$0 (plus domain ~$12/yr, plus optional email).

---

### Option B — Render (cheapest run-as-is; no rebuild)

*Deploy the app you already have, nearly untouched.*

1. *(Me)* Prep the code: move the admin password to an env var, add a `package.json` start script, make the data folder point at a persistent disk, push to GitHub.
2. *(You, ~20 min)* Create a free Render account → **New Web Service** → connect the GitHub repo → add a **Persistent Disk** (so uploads/content survive) → set `ADMIN_USER` / `ADMIN_PASS` env vars → Deploy.
3. *(You + me)* Register domain → add Render's DNS records → done. Free HTTPS is automatic.

**Your recurring cost:** ~$7/mo service + a few cents of disk (plus domain, optional email).
**Trade-off:** Render's free tier has *no* persistent disk and spins down when idle, so the ~$7 Starter tier is the real minimum for a CMS site.

---

### Option C — Replit (most beginner-friendly; no rebuild)

*Everything in one dashboard: code, hosting, secrets, domain.*

1. *(Me)* Same code prep as Render (password → secret, etc.).
2. *(You)* Import the repo into Replit → set secrets (admin user/pass) → create a **Reserved VM Deployment** (this is the always-on option with a permanent disk — do **not** use "Autoscale," which loses files) → attach your domain.

**Your recurring cost:** ~$20/mo range (Replit Core + the Reserved VM). Simplest to operate, priciest, and more tied to Replit's ecosystem than the others.

---

### Option D — Cheap VPS (cheapest run-as-is; most hands-on)

*A small rented server you fully control.*

1. *(Me)* Prepare a `Dockerfile` + a Caddy config (Caddy gives automatic HTTPS) and a short runbook.
2. *(You + me)* Rent a small server (Hetzner ~$5/mo, DigitalOcean ~$6/mo) → I give you copy-paste commands to install and run it → point domain at the server's IP.

**Your recurring cost:** ~$5/mo (plus domain, optional email).
**Trade-off:** you're now the sysadmin — updates and uptime are on you (I can automate most of it, but it's the most technical path).

---

## 5. My recommendation

- If you want the **most professional, essentially-free** result and don't mind me spending the build time: **Option A (Vercel + Supabase)** — your original instinct was good.
- If you'd rather be **live within the week for a few dollars** with almost no rebuild: **Option B (Render)**.

Everything else (Replit, VPS) is a valid variation on cost vs. convenience.

**Whatever you pick, my next actions are the same first step:** move the admin password into a secret and prepare the code + GitHub repo. Tell me the option and I'll start.

---

## 6. What I can and can't do

- **I can:** write all the code and config, set up the GitHub repo, migrate your data, prepare every step, and give you exact click-by-click instructions.
- **I can't:** create your hosting/domain accounts or enter your payment details — those need your email and card. That part is yours (I'll walk you through it), and it's the only piece Claude can't do for you.
