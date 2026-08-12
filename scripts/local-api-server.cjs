const express = require('express');
const { config } = require('dotenv');

config({ path: '.env.local', quiet: true });

const youtubeHandler = require('../api/youtube');
const twitchHandler = require('../api/twitch');

const app = express();
const port = Number(process.env.PORT || 3000);

app.all('/api/youtube', youtubeHandler);
app.all('/api/twitch', twitchHandler);

app.listen(port, () => {
  console.log(`Local API listening on http://localhost:${port}`);
});
