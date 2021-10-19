const intro = [
  'Champ,',
  'Fact:',
  'Everybody says',
  'Dang...',
  'Check it:',
  'Just saying...',
  'Superstar,',
  'Tiger,',
  'Yo,',
  'Know this:',
  'News alert:',
  'Girl,',
  'Ace,',
  'Excuse me but',
  'Experts agree:',
  'In my opinion,',
  'Hear ye, hear ye:',
  'Okay, listen up:'
];

const first = [
  'the mere idea of you',
  'your soul',
  'your hair today',
  'everything you do',
  'your personal style',
  'every thought you have',
  'that sparkle in your eye',
  'your presence here',
  'what you got going on',
  'the essential you',
  "your life's journey",
  'that saucy personality',
  'your DNA',
  'that brain of yours',
  'your choice of attire',
  'the way you roll',
  'whatever your secret is',
  "all of y'all"
];

const second = [
  'has serious game,',
  'rains magic,',
  'deserves the Nobel Prize,',
  'raises the roof,',
  'breeds miracles,',
  'is paying off big time,',
  'shows mad skills,',
  'just shimmers,',
  'is a national treasure,',
  'gets the party hopping,',
  'is the next big thing,',
  'roars like a lion,',
  'is a rainbow factory,',
  'is made of diamonds,',
  'makes birds sing,',
  'should be taught in school,',
  "makes my world go 'round,",
  'is 100% legit,'
];

const conclusion = [
  '24/7.',
  'can I get an amen?',
  "and that's a fact.",
  'so treat yourself.',
  'you feel me?',
  "that's just science.",
  'would I lie?',
  'for reals.',
  'mic drop.',
  'you hidden gem.',
  'snuggle bear.',
  'period.',
  "now let's dance.",
  'high five!',
  'say it again!',
  'according to CNN.',
  'so get used to it.',
  'big time.'
];

export class PepTalk {
  static givePepTalk(): string {
    return `${this.generateIntro()} ${this.generateFirst()} ${this.generateSecond()} ${this.generateConclusion()}`;
  }

  static generateIntro(): string {
    return intro[Math.floor(Math.random() * intro.length)];
  }

  static generateFirst(): string {
    return first[Math.floor(Math.random() * first.length)];
  }

  static generateSecond(): string {
    return second[Math.floor(Math.random() * second.length)];
  }

  static generateConclusion(): string {
    return conclusion[Math.floor(Math.random() * conclusion.length)];
  }
}
