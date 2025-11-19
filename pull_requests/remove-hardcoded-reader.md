This PR removes the hardcoded Gemini API key from api/chat.js and replaces it with using process.env.GEMINI_API_KEY. It also improves CORS headers, adds a fetch timeout, better upstream error parsing and logging, and safer responses to the client. IMPORTANT: If the API key was exposed in previous commits, revoke/rotate it in Google Cloud Console and update Vercel Environment Variables. Do not merge until the leaked key is revoked. Changes made:
- api/chat.js: use process.env, add timeout, improve error handling, add Authorization header support, return raw payload for debugging when no text.

Testing steps:
1) Revoke/rotate old API key in Google Cloud Console.
2) Add new GEMINI_API_KEY to Vercel Environment Variables and redeploy.
3) Test locally with .env.local and curl POST to /api/chat.