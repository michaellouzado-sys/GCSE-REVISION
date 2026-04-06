# GCSE Revision Planner

React + Vite app with Supabase sync and Vercel hosting.

---

## STEP 1 — Set up Supabase database

1. Go to your Supabase project → **Database → SQL Editor → New Query**
2. Paste the contents of `supabase-schema.sql` and click **Run**
3. This creates the `planner_data` table with the right permissions

---

## STEP 2 — Push to GitHub

Open Terminal (Mac: Cmd+Space → type Terminal → Enter):

```bash
# Install dependencies first
cd ~/Desktop  # or wherever you want to work
cp -r /path/to/gcse-app .
cd gcse-app
npm install
npm run build   # make sure it builds without errors
```

Then push to GitHub:
```bash
git init
git add .
git commit -m "Initial commit"
```

Go to github.com → New repository → name it `gcse-planner` → Create (no README)

Then copy the commands GitHub shows you under "push an existing repository" — looks like:
```bash
git remote add origin https://github.com/YOURNAME/gcse-planner.git
git branch -M main
git push -u origin main
```

---

## STEP 3 — Deploy on Vercel

1. Go to vercel.com → **Add New Project**
2. Import your `gcse-planner` GitHub repository
3. Framework preset: **Vite** (auto-detected)
4. Click **Deploy** — takes ~30 seconds
5. You get a live URL like `gcse-planner.vercel.app`

---

## Accounts

- **Your son** → signs up at the app URL with any email/password
- **You (parent)** → sign in with `michaellouzado@hotmail.com` — you automatically get the read-only parent dashboard showing his XP, subject levels, and recent activity

---

## Local development

```bash
npm install
npm run dev
```

Opens at http://localhost:5173
