# 梦境记忆 API（Vercel + DeepSeek）

Vercel Functions endpoint: `POST /api/analyze`. Provider key remains server-side.

## Vercel environment variables
- `DEEPSEEK_API_KEY`: your DeepSeek platform API key (mark as Sensitive)
- `ANALYSIS_ACCESS_CODE`: a long random pilot access code (same value will be configured in the app)
- `ALLOWED_ORIGINS`: optional comma-separated exact origins for browser previews. Native Android requests do not send Origin. Leave empty if only using the Android app.

Deploy this folder as the Vercel project root. After deploy, endpoint is `https://<project>.vercel.app/api/analyze`.

Do not put the DeepSeek key in the Expo app, a committed `.env`, or GitHub. `EXPO_PUBLIC_ANALYSIS_ACCESS_CODE` is visible inside the app and is only a basic pilot gate, not proper user authentication. Keep the pilot limited to trusted testers, and set provider spending/usage controls where available.
