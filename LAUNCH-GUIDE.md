# Launch Guide — The CX Algorithm website on Vercel + Supabase

*A complete, beginner-friendly, step-by-step. You've never done this before — that's fine. Read it top to bottom once, then we'll do it together, one phase at a time. Nothing here is risky or permanent until the very last step.*

---

## How to read this guide

Every step is tagged:

- 👤 **YOU** — something you click or type in a website. I'll be right here to help.
- 🤖 **CLAUDE (me)** — code and setup I do for you. You don't touch these.

You never have to write code. Your job is: make a few free accounts, copy-paste some values I give you, and click "Deploy." My job is everything technical.

**Total time for your parts:** roughly 1–1.5 hours, spread across a few sittings. No rush.

---

## The big picture (in plain words)

Right now your whole website lives on your own computer. To put it on the internet we need two free services:

- **Vercel** = the *stage*. It shows your web pages to the world and runs the behind-the-scenes logic (the admin panel, the contact form).
- **Supabase** = the *filing cabinet*. It permanently stores your content, your uploaded images/audio, and the messages people send you.

They talk to each other. You edit things in your admin panel → it saves to Supabase → your live pages read from Supabase. Simple as that.

We also use two more, later:
- **GitHub** = a safe online copy of the code, which Vercel reads from. (Every time I make a change, your live site updates automatically.)
- **Cloudflare** = points your web address (like `thecxalgorithm.com`) at the site, and gives you free email forwarding.

---

## What it costs

- **Vercel:** Free (Hobby plan). *Note: the free plan is for non-commercial sites. A personal podcast is fine. If you later sell sponsorships directly through the site, they'd want the Pro plan (~$20/mo).*
- **Supabase:** Free. Includes 1 GB of file storage. *Enough for your images and roughly 15–40 audio episodes. Video is huge — for video episodes we'll use Spotify embeds instead of storing them (your designer recommended this too). If you ever self-host lots of media, Supabase Pro is ~$25/mo.*
- **GitHub & Cloudflare:** Free.
- **Domain name:** ~$12/year (the one thing that always costs money).
- **Email:** Free forwarding, or ~$6/mo for a full Google Workspace inbox (optional).

**Bottom line: ~$12/year to start.**

---

## The five phases at a glance

1. **Make your accounts** (👤 you, ~15 min)
2. **Set up Supabase — your filing cabinet** (👤 a few clicks + 🤖 me)
3. **I rebuild the code for the cloud** (🤖 me — you relax)
4. **Deploy to Vercel — go live** (👤 you click, I guide)
5. **Add your domain + email** (👤 you + 🤖 me)

Then a **launch checklist** to make sure it's all safe and working.

---

## PHASE 1 — Make your accounts (👤 YOU, ~15 min)

You'll make three free accounts. Use the **same email** for all of them, and sign up with **"Continue with GitHub"** where offered — it links everything together and saves time.

### 1.1 — GitHub (do this first)
1. Go to **github.com** → click **Sign up**.
2. Enter your email, a password, and a username (e.g. `eslam-afifi`).
3. Verify your email. That's it — you don't need to know how GitHub works; it's just a safe home for the code.

### 1.2 — Supabase
1. Go to **supabase.com** → click **Start your project**.
2. Click **Continue with GitHub** → approve. (This links it to the account you just made.)
3. You're in the dashboard. Don't create a project yet — we do that together in Phase 2.

### 1.3 — Vercel
1. Go to **vercel.com** → click **Sign Up**.
2. Choose **Hobby** (the free one) → **Continue with GitHub** → approve.
3. You're in. Don't import anything yet — that's Phase 4.

✅ **When all three say you're logged in, Phase 1 is done. Tell me and we move on.**

---

## PHASE 2 — Set up Supabase (👤 a few clicks, 🤖 me)

This is where your content and files will live.

### 2.1 — 👤 Create the project
1. In Supabase, click **New project**.
2. **Name:** `cx-algorithm`
3. **Database Password:** click **Generate a password**, then **copy it and paste it somewhere safe** (a notes file). You rarely need it, but don't lose it.
4. **Region:** pick the one closest to most of your listeners (e.g. *West EU (Ireland)* or *Central EU (Frankfurt)*). If unsure, ask me.
5. Click **Create new project** and wait ~2 minutes while it sets up.

### 2.2 — 👤 Send me your project's public keys
Once it's ready:
1. Click the **gear icon (Project Settings)** → **API**.
2. You'll see three things. **Copy me the first two only:**
   - **Project URL** (looks like `https://abcd1234.supabase.co`)
   - **anon public** key (a long text string labelled "anon" / "public")
3. 🔒 **DO NOT send me the `service_role` key.** It's the master key. You'll paste it directly into Vercel yourself in Phase 4. If you ever accidentally share it, tell me and we'll regenerate it.

### 2.3 — 🤖 I build your filing cabinet
With those two values, I'll give you a block of setup instructions to run **one time**:
1. I'll hand you some text to paste into Supabase's **SQL Editor** (there's a button literally called "Run" — that's all you click).
2. That creates the tables (for your content and contact messages) and the storage folders (for images and audio).
3. I'll then load your *current* website content into it, so nothing you've built is lost.

✅ **After this, your filing cabinet exists and holds your content. On to the code.**

---

## PHASE 3 — I rebuild the code for the cloud (🤖 ME — you relax)

Nothing for you to do here. I'll:
- Convert your behind-the-scenes server into the format Vercel uses.
- Point your public pages at Supabase so they read live content.
- Wire up the admin panel to save to Supabase.
- Set up image uploads and **big audio/video uploads that go straight to Supabase** (so large files aren't a problem).
- Replace the admin password with a secure secret you'll set yourself.
- Put it all in your GitHub repo.

I'll test everything and then tell you it's ready for Phase 4. **This is the part that takes me a few work sessions** — I'll keep you posted.

---

## PHASE 4 — Deploy to Vercel (👤 YOU click, 🤖 I guide)

Now we put it on the internet. I'll be giving you exact values to paste.

### 4.1 — 👤 Import the project
1. In Vercel, click **Add New… → Project**.
2. You'll see your GitHub repo (`cx-algorithm-system`) in the list → click **Import**.

### 4.2 — 👤 Add the secret settings
Before clicking Deploy, open the **Environment Variables** section and add these (I'll give you the exact values to paste for each):
- `SUPABASE_URL` — your project URL
- `SUPABASE_ANON_KEY` — the public key
- `SUPABASE_SERVICE_ROLE_KEY` — 🔒 the master key you kept private (paste it here, only here)
- `ADMIN_USER` — a username you choose for logging into the admin
- `ADMIN_PASSWORD` — a **strong** new password you choose (this replaces `cxalgorithm2026`)

### 4.3 — 👤 Deploy
1. Click **Deploy**. Wait ~1 minute.
2. Vercel gives you a live link like `cx-algorithm-system.vercel.app`. **Your site is on the internet.** 🎉
3. We test it together: open the pages, log into `/admin`, upload a test image, send a test contact message. If anything's off, I fix it and it redeploys automatically.

---

## PHASE 5 — Your domain + email (👤 YOU + 🤖 me)

Your site works at the `.vercel.app` link, but you'll want `thecxalgorithm.com`.

### 5.1 — 👤 Register the domain (~$12/yr)
1. Go to **cloudflare.com** → make a free account.
2. Go to **Domain Registration → Register Domain** → search for the name you want → buy it (Cloudflare sells at cost, no markup).

### 5.2 — 🤖 + 👤 Connect it
1. In Vercel: **Project → Settings → Domains** → type your domain → Vercel shows you the DNS records to add.
2. I'll translate those into the exact entries; you paste them into Cloudflare's **DNS** page.
3. Wait a little while (can be minutes to a couple hours) and your domain goes live with automatic HTTPS (the padlock).

### 5.3 — 👤 Email (optional, free)
To receive mail at `hello@thecxalgorithm.com`:
1. In Cloudflare: **Email → Email Routing** → forward `hello@yourdomain` to your normal Gmail. Free.
2. (Only if you want to *send* from that address: add Google Workspace ~$6/mo later.)

---

## LAUNCH CHECKLIST (before you tell the world)

- [ ] Admin password changed to something strong (done in Phase 4, not the old `cxalgorithm2026`).
- [ ] You can log into `/admin` and edit content, and the live site updates.
- [ ] Contact form sends, and the message appears in your admin **Messages** tab.
- [ ] An uploaded image shows on the live site.
- [ ] The padlock (HTTPS) shows on your domain.
- [ ] Real content added: your episode audio/links, guest logos, platform links, newsletter link, gallery photos.
- [ ] Test on your phone as well as your computer.

---

## What I need from you to START

Just **Phase 1** — create the three free accounts (GitHub, Supabase, Vercel), all with the same email, using "Continue with GitHub" where offered.

While you do that, I can begin **Phase 3** (rebuilding the code) in the background, since that part doesn't need your accounts yet. So we can work in parallel.

**Your very first click:** go to **github.com** and sign up. Then tell me when the three accounts are ready, and paste me your Supabase **Project URL** + **anon key** once you've created the project in Phase 2.

That's it. We'll go one phase at a time, and I'll be here for every step.
