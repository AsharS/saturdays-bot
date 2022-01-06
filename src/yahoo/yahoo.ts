import axios, { AxiosResponse } from 'axios';
import { MessageEmbed } from 'discord.js';
import { Matchup } from './matchup';

let fantasyAccessToken: string;

export class Yahoo {
  static async getScores() {
    let body;

    body = await this.getScoreboard();

    const leagueName = body.data.fantasy_content.league[0].name;
    const leagueScoreboard = body.data.fantasy_content.league[1].scoreboard;
    const matchups = leagueScoreboard['0'].matchups;

    const embedMessage = new MessageEmbed();
    embedMessage.setAuthor(
      `${leagueName} - Week ${leagueScoreboard.week}`,
      'https://yahoofantasysports-res.cloudinary.com/image/upload/t_s192sq/fantasy-logos/f15f44040d9f09ba0b2541a9ffcc5579495d5b70d3df858654e88d1f3c03c38e.jpg',
      'https://basketball.fantasysports.yahoo.com/nba/20925'
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

  static async getScoreboard(throwError = false): Promise<AxiosResponse> {
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
        'https://fantasysports.yahooapis.com/fantasy/v2/league/nba.l.20925/scoreboard',
        config
      )
      .catch(async (e) => {
        if (throwError) throw e;

        await this.setToken();

        return this.getScoreboard(true);
      });
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
}
