import dotenv from 'dotenv';
import express from 'express';
import { Client, Intents, TextChannel } from 'discord.js';
import nodeCron from 'node-cron';
import { Yahoo } from './yahoo/yahoo';
import { Git } from './git/git';
import { MusicService } from './music/service';
import { PepTalk } from './pepTalk/pepTalk';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const isYahooEnabled = () => {
  return JSON.parse(process.env.YAHOO_COMMANDS_ENABLED as string);
};

app.get('/', async (req, res) => {
  const embedMessages = await Git.getLatestStatsUpdate();

  if (embedMessages) {
    const channel: TextChannel = client.channels.cache.get(
      process.env.UPDATES_CHANNEL_ID as string
    ) as TextChannel;

    for (const embedMessage of embedMessages) {
      channel.send({ embeds: [embedMessage] });
    }
  }

  res.send();
});

app.listen(port);

Git.getLatestStatsUpdate();

console.log('Starting git cron job...');
nodeCron.schedule('*/5 * * * *', async () => {
  const embedMessages = await Git.getLatestStatsUpdate();

  if (embedMessages) {
    const channel: TextChannel = client.channels.cache.get(
      process.env.UPDATES_CHANNEL_ID as string
    ) as TextChannel;

    for (const embedMessage of embedMessages) {
      channel.send({ embeds: [embedMessage] });
    }
  }
});

if (isYahooEnabled() && (process.env.SBA_CHANNEL_ID as string)) {
  console.log('Starting SBA cron job...');
  nodeCron.schedule(
    '0 0 * * *',
    async () => {
      const channel: TextChannel = client.channels.cache.get(
        process.env.SBA_CHANNEL_ID as string
      ) as TextChannel;
      const message = await Yahoo.getScores();
      channel.send({ embeds: [message] });
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
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_VOICE_STATES
  ]
});

const yahooScoresCommand = {
  name: 'scores',
  description: "Display the current week's scores",
  options: []
};
const yahooStandingsCommand = {
  name: 'standings',
  description: "Display the current season's standings",
  options: []
};

const pepTalkCommand = {
  name: 'peptalk',
  description: 'Receive a pep talk',
  options: []
};

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  client.user?.setActivity('every day is Saturday!');

  Yahoo.setToken();

  if (isYahooEnabled()) {
    client.application?.commands.create(yahooScoresCommand);
    client.application?.commands.create(yahooStandingsCommand);
  }
  client.application?.commands.create(pepTalkCommand);
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) {
    return;
  }

  console.log(
    `${interaction.commandName} executed by: ${interaction.user.tag}`
  );

  // Check if it is the correct command
  if (interaction.commandName === yahooScoresCommand.name) {
    const message = await Yahoo.getScores();
    await interaction.reply({ embeds: [message] });
  } else if (interaction.commandName === yahooStandingsCommand.name) {
    const message = await Yahoo.getStandings();
    await interaction.reply(message);
  } else if (interaction.commandName == pepTalkCommand.name) {
    const message = PepTalk.givePepTalk();
    await interaction.reply(message);
  }
});

const prefix = '!';

const musicTextChannel = process.env.MUSIC_CHANNEL_ID as string;
const musicService = new MusicService();

client.on('messageCreate', async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix)) {
    return;
  }

  if (message.channel.id === musicTextChannel) {
    musicService.parseMessage(prefix, message);
  }
});

client.on('voiceStateUpdate', (oldState, newState) => {
  if (
    oldState.channelId !== oldState.guild.me?.voice.channelId ||
    newState.channel
  ) {
    return;
  }

  if (oldState.channel?.members.size === 1) {
    musicService.stop();
  }
});

client.login(process.env.DISCORD_TOKEN);
