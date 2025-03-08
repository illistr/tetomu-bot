const { Client, GatewayIntentBits } = require('discord.js');
const { google } = require('googleapis');
const fs = require('fs');
require('dotenv').config();

// Constants
const LAST_VIDEO_FILE = './lastVideoId.json';

// bot config
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages] });

// configure YouTube API
const youtube = google.youtube({
  version: 'v3',
  auth: process.env.YOUTUBE_API_KEY,
});

// Functions to handle persistent storage
function saveLastVideoId(videoId) {
  try {
    fs.writeFileSync(LAST_VIDEO_FILE, JSON.stringify({ lastVideoId: videoId }), 'utf-8');
  } catch (error) {
    console.error('Error saving last video ID:', error);
  }
}

function loadLastVideoId() {
  try {
    if (fs.existsSync(LAST_VIDEO_FILE)) {
      const data = fs.readFileSync(LAST_VIDEO_FILE, 'utf-8');
      return JSON.parse(data).lastVideoId || null;
    }
  } catch (error) {
    console.error('Error loading last video ID:', error);
  }
  return null;
}

// save last video id
let lastVideoId = loadLastVideoId();

// fetch latest video or livestream
async function fetchLatestVideo() {
  try {
    const response = await youtube.search.list({
      channelId: process.env.YOUTUBE_CHANNEL_ID,
      part: 'snippet',
      order: 'date',
      maxResults: 1,
      type: 'video',
    });

    if (response.data.items.length > 0) {
      const video = response.data.items[0];
      return {
        id: video.id.videoId,
        title: video.snippet.title,
        url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
        publishedAt: video.snippet.publishedAt,
      };
    }
  } catch (error) {
    console.error('Failed to fetch video:', error);
  }
  return null;
}

// announce new video or livestream
async function notifyDiscord() {
  const video = await fetchLatestVideo();
  if (video && video.id !== lastVideoId) {
    const channel = client.channels.cache.get(process.env.DISCORD_CHANNEL_ID);
    if (channel) {
      channel.send(`🎥  **Video mới đã ra mắt! @everyone**\n🤔  **${video.title}**\nXem ngay: ${video.url}`);
      lastVideoId = video.id;
      saveLastVideoId(lastVideoId); 
    }
  } else {
    console.log('No video found or already announced.');
  }
}

// bot ready
client.once('ready', () => {
  console.log(`${client.user.tag} Login`);
  setInterval(notifyDiscord, 1 * 60 * 1000);
});

// login bot
client.login(process.env.DISCORD_TOKEN);
