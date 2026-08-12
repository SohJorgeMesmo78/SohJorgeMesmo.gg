const express = require('express');
const { config } = require('dotenv');
const { resolve } = require('node:path');

const projectRoot = resolve(__dirname, '..');
const envPath = resolve(projectRoot, '.env.local');
const envResult = config({ path: envPath, quiet: true, override: true });

if (envResult.error) {
  throw new Error(`Unable to load local environment file at ${envPath}: ${envResult.error.message}`);
}

console.log('[Local API] Environment loaded.', {
  youtubeApiKeyConfigured: Boolean(process.env.YOUTUBE_API_KEY?.trim()),
  twitchClientIdConfigured: Boolean(process.env.TWITCH_CLIENT_ID?.trim()),
  twitchClientSecretConfigured: Boolean(process.env.TWITCH_CLIENT_SECRET?.trim()),
});

const youtubeHandler = require('../api/youtube');
const twitchHandler = require('../api/twitch');

const app = express();
const port = Number(process.env.PORT || 3000);

app.all('/api/youtube', youtubeHandler);
app.all('/api/twitch', twitchHandler);

app.listen(port, () => {
  console.log(`Local API listening on http://localhost:${port}`);
});
