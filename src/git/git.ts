import axios from 'axios';
import { MessageEmbed } from 'discord.js';

export class Git {
  static lastCommit: string | undefined;

  static async getLatestStatsUpdate() {
    console.log('Checking for new commits');

    const body = await axios.get(
      'https://api.github.com/repos/AsharS/saturdays-stats/git/refs/heads/master'
    );
    const latestCommit = body.data.object.sha;
    let returnMessage: MessageEmbed | undefined = undefined;

    if (this.lastCommit && this.lastCommit != latestCommit) {
      const compareBody = await axios.get(
        `https://api.github.com/repos/AsharS/saturdays-stats/compare/${this.lastCommit}...${latestCommit}`
      );
      if (compareBody.data.commits.length > 0) {
        const embedMessage = new MessageEmbed();
        embedMessage.setAuthor(
          'saturdays-stats updates',
          'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
          'https://github.com/AsharS/saturdays-stats'
        );

        for (const commitBody of compareBody.data.commits.reverse()) {
          const dateTime = new Date(commitBody.commit.author.date).toLocaleString('en-US');
          embedMessage.addField(`${commitBody.commit.author.name} on ${dateTime}`,`${commitBody.commit.message}`);
        }

        returnMessage = embedMessage;
      }
    } else {
      console.log('No new commits');
    }

    this.lastCommit = latestCommit;
    return returnMessage;
  }
}
