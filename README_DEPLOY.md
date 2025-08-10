# Deploying NoMo to Netlify

## 1) Environment Variables
Set these in Netlify Site Settings → Build & deploy → Environment:

- NEXTAUTH_URL=https://YOUR-SITE.netlify.app
- NEXTAUTH_SECRET=your_random_string
- GOOGLE_CLIENT_ID=...
- GOOGLE_CLIENT_SECRET=...
- GEMINI_API_KEY=...
- NEXT_PUBLIC_FIREBASE_API_KEY=...
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
- NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
- NEXT_PUBLIC_FIREBASE_APP_ID=...
- NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=...

## 2) Google OAuth
Add redirect URIs in Google Cloud → Credentials → Your OAuth Client:
- http://localhost:3000/api/auth/callback/google
- https://YOUR-SITE.netlify.app/api/auth/callback/google

If using Gmail API scope, keep app in Testing with test users until verification.

## 3) Firestore Rules
Publish `firestore.rules` in Firebase Console or via CLI:

```
firebase deploy --only firestore:rules
```

## 4) Deploy
Push to GitHub and connect the repo on Netlify. Netlify will detect `netlify.toml` and run:

```
npm run build
```

## 5) Post-deploy
- Update `NEXTAUTH_URL` to your final site URL if it changes, re-deploy.
- In the app, verify:
  - Google sign-in works
  - Inbox scan runs
  - Concierge requests appear in Firestore
  - Gemini guides/insights load
