# IoT Puzzle

A word-search game for IoT syllabus units. Scores are stored in a Google Sheet, and the global leaderboard is read from it.

## 1. Set up the Google Sheet

1. Create a new Google Sheet.
2. Open **Extensions → Apps Script**, delete the default code, and paste in the contents of [google-apps-script/Code.gs](google-apps-script/Code.gs). Save.
3. Click **Deploy → New deployment**, choose the type **Web app**, and set:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, authorize the script, and copy the **Web app URL** (it ends in `/exec`).

The script creates a `Scores` tab automatically the first time a score is saved.

> If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version**. Otherwise the URL keeps serving the old code.

## 2. Run locally

```bash
cp .env.example .env.local   # then paste your Web app URL into it
npm install
npm run dev
```

## 3. Deploy to Vercel

1. Push this folder to a GitHub repository.
2. In Vercel, click **Add New → Project** and import the repository. Vercel detects Vite automatically.
3. Under **Environment Variables**, add `VITE_SHEETS_URL` and set it to your Web app URL.
4. Click **Deploy**. If you change the variable later, redeploy so the new value takes effect.
