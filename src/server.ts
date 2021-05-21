import dotenv from 'dotenv';
import express from 'express';
import { Client, Intents, TextChannel } from 'discord.js';
import nodeCron from 'node-cron';
import { Yahoo } from './yahoo/yahoo';
import { Git } from './git/git';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.get('/', async (req, res) => {
  const embedMessage = await Git.getLatestStatsUpdate();

  if (embedMessage) {
    const channel: TextChannel = client.channels.cache.get(
      process.env.UPDATES_CHANNEL_ID as string
    ) as TextChannel;
    channel.send(embedMessage);
  }

  res.send();
});

app.listen(port);

Git.getLatestStatsUpdate();

console.log('Starting git cron job...');
nodeCron.schedule('*/5 * * * *', async () => {
  const embedMessage = await Git.getLatestStatsUpdate();

  if (embedMessage) {
    const channel: TextChannel = client.channels.cache.get(
      process.env.UPDATES_CHANNEL_ID as string
    ) as TextChannel;
    channel.send(embedMessage);
  }
});

if (
  JSON.parse(process.env.YAHOO_CRON as string) &&
  (process.env.SBA_CHANNEL_ID as string)
) {
  console.log('Starting SBA cron job...');
  nodeCron.schedule(
    '0 0 * * *',
    async () => {
      const channel: TextChannel = client.channels.cache.get(
        process.env.SBA_CHANNEL_ID as string
      ) as TextChannel;
      const message = await Yahoo.getScores();
      channel.send(message);
    },
    {
      timezone: 'America/Chicago'
    }
  );
}

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES
  ]
});

const scoresCommand = {
  name: 'scores',
  description: "Display the current week's scores",
  options: []
};

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  client.user?.setActivity('every day is Saturday!');

  Yahoo.setToken();

  client.application?.commands.create(scoresCommand);
});

client.on('interaction', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  // Check if it is the correct command
  if (
    interaction.commandName === scoresCommand.name &&
    JSON.parse(process.env.YAHOO_COMMANDS_ENABLED as string)
  ) {
    const message = await Yahoo.getScores();
    interaction.reply(message);
  }
});

client.login(process.env.DISCORD_TOKEN);
