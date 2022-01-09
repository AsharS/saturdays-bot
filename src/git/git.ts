import axios from 'axios';
import { MessageEmbed } from 'discord.js';

export class Git {
  private static repoList = [
    {
      name: 'AsharS/saturdays-stats',
      branch: 'master'
    }
  ];
  private static lastCommitByRepo: Map<string, string> = new Map();

  static async getLatestStatsUpdate() {
    const returnMessages: MessageEmbed[] = [];

    console.log('Checking for new commits');

    for (const repo of this.repoList) {
      const body = await axios.get(
        `https://api.github.com/repos/${repo.name}/git/refs/heads/${repo.branch}`
      );
      const latestCommit = body.data.object.sha;

      if (
        this.lastCommitByRepo.has(repo.name) &&
        this.lastCommitByRepo.get(repo.name) != latestCommit
      ) {
        const compareBody = await axios.get(
          `https://api.github.com/repos/${
            repo.name
          }/compare/${this.lastCommitByRepo.get(repo.name)}...${latestCommit}`
        );
        if (compareBody.data.commits.length > 0) {
          const embedMessage = new MessageEmbed();
          embedMessage.setAuthor({
            name: `${repo.name} updates`,
            iconURL:
              'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png',
            url: `https://github.com/${repo.name}`
          });

          for (const commitBody of compareBody.data.commits.reverse()) {
            const dateTime = new Date(
              commitBody.commit.author.date
            ).toLocaleString('en-US');
            embedMessage.addField(
              `${commitBody.commit.author.name} on ${dateTime}`,
              `${commitBody.commit.message}`
            );
          }

          returnMessages.push(embedMessage);
        }
      } else {
        console.log('No new commits');
      }

      this.lastCommitByRepo.set(repo.name, latestCommit);
    }

    return returnMessages;
  }
}
