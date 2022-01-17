import { codeBlock } from '@discordjs/builders';
import axios, { AxiosResponse } from 'axios';
import { MessageEmbed } from 'discord.js';
import { Matchup } from './matchup';
import { Standing } from './standing';

const leagueKey = 'nba.l.20925';
const leagueLogoURL =
  'https://yahoofantasysports-res.cloudinary.com/image/upload/t_s192sq/fantasy-logos/f15f44040d9f09ba0b2541a9ffcc5579495d5b70d3df858654e88d1f3c03c38e.jpg';
let fantasyAccessToken: string;

export class Yahoo {
  static async getScores() {
    const body = await this.getScoreboard();

    const leagueName = body.data.fantasy_content.league[0].name;
    const leagueURL = body.data.fantasy_content.league[0].url;
    const leagueScoreboard = body.data.fantasy_content.league[1].scoreboard;
    const matchups = leagueScoreboard['0'].matchups;

    const embedMessage = new MessageEmbed();
    embedMessage.setAuthor(
      `${leagueName} - Week ${leagueScoreboard.week}`,
      leagueLogoURL,
      leagueURL
    );

    for (let i = 0; i < matchups.count; i++) {
      const matchup = new Matchup(matchups[i].matchup['0'].teams);

      let team1Name = matchup.team1.name;
      let team2Name = matchup.team2.name;
      let team1Score = matchup.team1.score;
      let team2Score = matchup.team2.score;
      if (Number(matchup.team1.score) > Number(matchup.team2.score)) {
        team1Name = `**${team1Name}**`;
      } else if (Number(matchup.team1.score) < Number(matchup.team2.score)) {
        team2Name = `**${team2Name}**`;
      }

      embedMessage.addField(
        '\u200B',
        `${team1Name} - ${team1Score} *(${matchup.team1.projectedScore})* \u200B \u200B \`vs\` \u200B \u200B ${team2Score} *(${matchup.team2.projectedScore})* - ${team2Name}`
      );
    }

    return embedMessage;
  }

  static async getStandings() {
    const standings: Standing[] = [];

    const body = await this.getStandingsFromYahoo();
    const teams = body.data.fantasy_content.league[1].standings[0].teams;

    for (const [key, value] of Object.entries<any>(teams)) {
      if (typeof value === 'object') {
        const teamName = value.team[0][2].name;
        const teamStanding = value.team[2].team_standings;

        standings.push({
          teamName: teamName,
          rank: teamStanding.rank,
          wins: teamStanding.outcome_totals.wins,
          losses: teamStanding.outcome_totals.losses,
          ties: teamStanding.outcome_totals.ties
        });
      }
    }

    let standingsMessage = '';
    for (const standing of standings) {
      standingsMessage += `${standing.rank}. ${standing.teamName} (${standing.wins}-${standing.losses}-${standing.ties})\n`;
    }
    standingsMessage = standingsMessage.trim();

    return codeBlock(standingsMessage);
  }

  static async setToken() {
    const tokenURL = 'https://api.login.yahoo.com/oauth2/get_token';
    const tokenBody = {
      client_id: process.env.YAHOO_CLIENT_ID as string,
      client_secret: process.env.YAHOO_CLIENT_SECRET as string,
      grant_type: 'refresh_token',
      redirect_uri: 'oob',
      refresh_token: process.env.YAHOO_REFRESH_TOKEN as string
    };
    const config = {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    try {
      const body = await axios.post(
        tokenURL,
        new URLSearchParams(tokenBody),
        config
      );
      fantasyAccessToken = body.data.access_token;
    } catch (e) {
      console.error(e);
    }
  }

  private static async getScoreboard(
    throwError = false
  ): Promise<AxiosResponse> {
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
        `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/scoreboard`,
        config
      )
      .catch(async (e) => {
        if (throwError) throw e;

        await this.setToken();

        return this.getScoreboard(true);
      });
  }

  private static async getStandingsFromYahoo(
    throwError = false
  ): Promise<AxiosResponse> {
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
        `https://fantasysports.yahooapis.com/fantasy/v2/league/${leagueKey}/standings`,
        config
      )
      .catch(async (e) => {
        if (throwError) throw e;

        await this.setToken();

        return this.getScoreboard(true);
      });
  }
}
