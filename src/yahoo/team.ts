export class Team {
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
