# AI Dating Coach — Deploy for free

This turns your Claude artifact into a real website with its own URL, that other
people can actually use — for $0, using GitHub + Vercel's free tier.

## What's in this folder
- `src/App.jsx` — your whole app (same code from Claude, just wired up properly)
- `api/chat.js` — a tiny backend that holds your Gemini API key safely on the
  server, so it's never visible to anyone using the site
- everything else — standard project plumbing (Vite), you don't need to touch it

## One-time setup (about 10 minutes)

### 1. Get a GitHub account (free)
Go to github.com and sign up if you don't have one.

### 2. Get a Vercel account (free)
Go to vercel.com → "Sign Up" → choose "Continue with GitHub". This links the two
so Vercel can deploy straight from your code.

### 3. Get your Gemini API key
Go to Google AI Studio (aistudio.google.com) → Get API key. Copy it somewhere safe —
you'll paste it into Vercel in step 6, not into any file.

### 4. Put this project on GitHub
- On github.com, click "New repository," name it `ai-dating-coach`, keep it Private
  or Public (your call), and create it.
- On your computer, open a terminal in this folder and run:
  ```
  git init
  git add .
  git commit -m "first version"
  git branch -M main
  git remote add origin https://github.com/YOUR-USERNAME/ai-dating-coach.git
  git push -u origin main
  ```
  (Replace YOUR-USERNAME with your actual GitHub username.)

### 5. Import the project into Vercel
- On vercel.com, click "Add New" → "Project"
- Pick the `ai-dating-coach` repo you just pushed
- Vercel auto-detects it's a Vite app — leave the defaults, click "Deploy"

### 6. Add your API key to Vercel (important — do this before or right after deploying)
- In your Vercel project, go to Settings → Environment Variables
- Add one: Name = `GEMINI_API_KEY`, Value = the key you copied in step 3
- Redeploy (Vercel → Deployments → click the three dots on the latest → Redeploy)

### 7. Set up Firebase (this is what locks each person's profile to their account)
Without this step, sign-in won't work at all. Takes about 10 minutes.

1. Go to **console.firebase.google.com** → **Add project** → give it any name → follow the prompts (you can skip Google Analytics, it's not needed here).
2. In your new project: **Build → Authentication → Get started → Sign-in method → Google → Enable → Save.**
3. **Build → Firestore Database → Create database** → start in **production mode** → pick any region → Enable.
4. Once created, go to the **Rules** tab in Firestore, delete what's there, and paste in the contents of `firestore.rules` (included in this folder) → **Publish**. This is what actually stops one person from seeing another person's profile.
5. Go to **Project settings (gear icon) → General → scroll to "Your apps" → click the `</>` (web) icon** → give it a nickname → **Register app**. Firebase shows you a config block — copy these six values: `apiKey`, `authDomain`, `projectId`, `storageBucket`, `messagingSenderId`, `appId`.
6. Back in **Vercel → Settings → Environment Variables**, add all six as:
   - `VITE_FIREBASE_API_KEY`
   - `VITE_FIREBASE_AUTH_DOMAIN`
   - `VITE_FIREBASE_PROJECT_ID`
   - `VITE_FIREBASE_STORAGE_BUCKET`
   - `VITE_FIREBASE_MESSAGING_SENDER_ID`
   - `VITE_FIREBASE_APP_ID`

   (Unlike `ANTHROPIC_API_KEY`, these are safe to be public — Firebase's web config is meant to be visible in the browser. The real protection is the Firestore rule from step 4, plus step 7 below.)
7. Still in Firebase Console: **Authentication → Settings → Authorized domains → Add domain** → add your Vercel URL (e.g. `ai-dating-coach-yourname.vercel.app`). Without this, Google sign-in will fail on your live site with a "domain not authorized" error.
8. Redeploy on Vercel so it picks up the new environment variables.

**Free tier limits (Firebase "Spark" plan, no card required):** 50,000 free Google sign-ins/month, and Firestore gives 50,000 free document reads + 20,000 writes *per day*. You will not come close to either at a normal early-stage scale.

### 8. Done
Vercel gives you a free URL like `ai-dating-coach-yourname.vercel.app`. Anyone
can open that link, sign in with Google, and use the app on any device — their
profile follows their account, not the phone.

## Testing locally before you deploy (optional, on a computer)
Plain `npm run dev` only runs the frontend — it does NOT run `api/chat.js`,
so the AI won't respond if you test that way. To test the real thing locally:
```
npm install -g vercel
vercel dev
```
This runs both the frontend and the backend function together, and reads your
key from a `.env.local` file (copy `.env.example` to `.env.local` and fill in
your real key, plus the six `VITE_FIREBASE_*` values — that file is already
excluded from git, so it's never uploaded). Note: Google sign-in generally
works fine on `localhost` for testing, since Firebase authorizes it by default.

If you're doing everything from your phone, skip this section — just deploy
straight to Vercel (below) and test on the live URL instead.

## Production checklist (things to know before sharing the link widely)
- **Redeem codes are demo-only.** The codes in `App.jsx` (`REDEEM_CODES`) are
  checked in the browser, which means anyone who looks at the site's code can
  find them. Fine for testing with friends; before a real launch, move this
  check to a backend endpoint that marks each code as used.
- **No payment processing yet.** The "Upgrade to Pro" button just flips a
  local flag. Wire it to Razorpay or Apple/Google in-app purchases before
  charging real people.
- **Basic spam protection is in place** in `api/chat.js` (caps on message size),
  but there's no per-person rate limit yet. If it gets popular, consider adding
  one (Vercel has simple options for this) so one person can't run up your bill.
- **Voice mode** depends on the visitor's browser supporting the Web Speech API
  (works well in Chrome, spottier elsewhere) — it already fails gracefully with
  a message if unsupported.
- **Plan/session/streak data still lives on-device** (not in Firestore yet) —
  only the profile (name/age/gender/photo) follows the account across devices
  right now. Moving the rest to Firestore too is a natural next step if you
  want Pro status and history to follow people across devices as well.

## Making changes later
Every time you edit code and run:
```
git add .
git commit -m "describe your change"
git push
```
Vercel automatically redeploys the new version in about a minute.

## A note on cost and safety
- Vercel's free tier covers hosting — you won't pay Vercel anything for normal usage.
- The only real cost is Anthropic API usage (based on how much people chat with your
  AI dates). Keep an eye on console.anthropic.com's usage page once real people start
  using it.
- Because the API key lives in Vercel's environment variables (not in your code),
  nobody who visits the site can see or steal it.
- If usage ever gets large enough to worry about cost, add a request limit inside
  `api/chat.js` (e.g. cap total daily calls) before sharing the link more widely.

## Custom domain (optional, still free-ish)
Vercel lets you connect your own domain (like `aidatingcoach.com`) for free —
you just have to buy the domain itself from a registrar (~$10-15/year). Go to
your Vercel project → Settings → Domains to connect one once you have it.
