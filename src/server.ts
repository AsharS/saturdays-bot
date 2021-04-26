import dotenv from 'dotenv';
import axios, { AxiosResponse } from 'axios';
import qs from 'querystring';
import {
  Client,
  DMChannel,
  Message,
  MessageEmbed,
  TextChannel
} from 'discord.js';
import nodeCron from 'node-cron';

dotenv.config();
const client = new Client();
const refreshToken = process.env.YAHOO_REFRESH_TOKEN;
const channelId = process.env.CHANNEL_ID as string;
let fantasyAccessToken: string;

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  client.user?.setActivity('every day is Saturday!');

  setToken();
});

client.on('message', async (msg: Message) => {
  if (
    msg.channel.type !== 'dm' &&
    (msg.channel.type !== 'text' ||
      msg.channel.name !== 'saturday-bots-association')
  )
    return;

  const content = msg.content;

  if (!content || !content.startsWith('!')) return;

  if (msg.content === '!scores') {
    await showScores(msg.channel);
  } else {
    msg.reply('Type !scores you BOT');
  }
});

if (process.env.YAHOO_CRON) {
  console.log('Starting cron job...');
  nodeCron.schedule('0 0 * * *', () => {
    const channel: TextChannel = client.channels.cache.get(
      channelId
    ) as TextChannel;
    showScores(channel);
  }, {
    timezone: 'America/Chicago'
  });
}

async function showScores(channel: TextChannel | DMChannel) {
  let body;

  body = await getScoreboard();

  const leagueName = body.data.fantasy_content.league[0].name;
  const leagueScoreboard = body.data.fantasy_content.league[1].scoreboard;
  const matchups = leagueScoreboard['0'].matchups;

  const embedMessage = new MessageEmbed();
  embedMessage.setAuthor(
    `${leagueName} - Week ${leagueScoreboard.week}`,
    'https://yahoofantasysports-res.cloudinary.com/image/upload/t_s192sq/fantasy-logos/f15f44040d9f09ba0b2541a9ffcc5579495d5b70d3df858654e88d1f3c03c38e.jpg',
    'https://basketball.fantasysports.yahoo.com/nba/27882'
  );

  for (let i = 0; i < matchups.count; i++) {
    const matchup = new Matchup(matchups[i].matchup['0'].teams);

    let team1Name = matchup.team1.name;
    let team2Name = matchup.team2.name;
    let team1Score = matchup.team1.score;
    let team2Score = matchup.team2.score;
    if (Number(matchup.team1.score) > Number(matchup.team2.score)) {
      team1Name = `**${team1Name}**`;
    } else {
      team2Name = `**${team2Name}**`;
    }

    embedMessage.addField(
      '\u200B',
      `${team1Name} - ${team1Score} *(${matchup.team1.projectedScore})* \u200B \u200B \`vs\` \u200B \u200B ${team2Score} *(${matchup.team2.projectedScore})* - ${team2Name}`
    );
  }

  channel.send(embedMessage);
}

async function setToken() {
  const tokenURL = 'https://api.login.yahoo.com/oauth2/get_token';
  const tokenBody = {
    client_id: process.env.YAHOO_CLIENT_ID,
    client_secret: process.env.YAHOO_CLIENT_SECRET,
    grant_type: 'refresh_token',
    redirect_uri: 'oob',
    refresh_token: refreshToken
  };
  const config = {
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    }
  };

  try {
    const body = await axios.post(tokenURL, qs.stringify(tokenBody), config);
    fantasyAccessToken = body.data.access_token;
  } catch (e) {
    console.error(e);
  }
}

async function getScoreboard(throwError = false): Promise<AxiosResponse> {
  const config = {
    headers: {
      Authorization: `Bearer ${fantasyAccessToken}`
    },
    params: {
      format: 'json'
    }
  };
  return axios
    .get(
      'https://fantasysports.yahooapis.com/fantasy/v2/league/402.l.27882/scoreboard',
      config
    )
    .catch(async (e) => {
      if (throwError) throw e;

      await setToken();

      return getScoreboard(true);
    });
}

class Matchup {
  team1: Team;
  team2: Team;

  constructor(teams: any) {
    this.team1 = new Team(teams, '0');
    this.team2 = new Team(teams, '1');
  }
}

class Team {
  name: string;
  score: string;
  projectedScore: string;

  constructor(teams: any, teamNo: string) {
    this.name = teams[teamNo].team[0][2].name;
    this.score = teams[teamNo].team[1].team_points.total;
    this.projectedScore =
      teams[teamNo].team[1].team_live_projected_points.total;
  }
}

client.login(process.env.DISCORD_TOKEN);
