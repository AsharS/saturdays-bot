import { Team } from './team';

export class Matchup {
  team1: Team;
  team2: Team;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(teams: any) {
    this.team1 = new Team(teams, '0');
    this.team2 = new Team(teams, '1');
  }
}
