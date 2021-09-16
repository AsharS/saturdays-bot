import { Guild, Message, TextChannel } from 'discord.js';
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  NoSubscriberBehavior,
  StreamType,
  VoiceConnectionStatus
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import ytsr, { Video } from 'ytsr';

export class MusicService {
  private queue: Song[] = [];
  private textChannel?: TextChannel;
  private guild?: Guild;
  private voiceChannelId?: string;
  private player?: AudioPlayer;

  public parseMessage(prefix: string, message: Message) {
    this.textChannel = message.channel as TextChannel;
    const content = message.content.substr(
      prefix.length,
      message.content.length
    );
    const messageArray = content.split(' ');
    const command = messageArray.shift();
    const query = messageArray.join(' ');

    switch (command) {
      case 'play':
        this.addSong(query, message);
        break;
      case 'skip':
        this.skip();
        break;
      case 'stop':
        this.stop();
        break;
    }
  }

  public async stop() {
    this.queue = [];
    getVoiceConnection(this.guild?.id!)?.destroy();
    this.voiceChannelId = undefined;
    this.textChannel?.send('Finished playing.');
  }

  private async addSong(query: string, message: Message) {
    if (!message.guild || !message.member) {
      return;
    }

    this.guild = message.guild;
    this.voiceChannelId = message.member?.voice.channel?.id;

    if (this.voiceChannelId) {
      if (query.indexOf('youtube.com') > -1) {
        const songInfo = await ytdl.getBasicInfo(query);

        if (songInfo) {
          this.queue.push({
            title: songInfo.videoDetails.title,
            url: songInfo.videoDetails.video_url,
            requestedBy: message.member?.displayName
          });

          this.play();
        }
      } else {
        const filters = await ytsr.getFilters(query, {
          gl: 'US',
          hl: 'en'
        });
        const videoFilter = filters.get('Type')?.get('Video');
        if (videoFilter?.url) {
          const result = await ytsr(videoFilter.url, {
            gl: 'US',
            hl: 'en',
            limit: 10
          });
          if (result.items.length > 0) {
            const firstResult = result.items.find(
              (item) => !(item as Video).isLive
            ) as Video | undefined;
            if (firstResult) {
              this.queue.push({
                title: firstResult.title,
                url: firstResult.url,
                requestedBy: message.member?.displayName
              });

              this.play();
            } else {
              message.reply(`Could not find any videos matching \`${query}\`.`);
            }
          }
        }
      }
    } else {
      message.reply("You're a bigger bot than me, get in a voice channel.");
    }
  }

  private async play() {
    if (this.player && this.player.state.status == AudioPlayerStatus.Playing) {
      this.textChannel?.send(
        `Added \`${this.queue[this.queue.length - 1].title}\` to the queue.`
      );
      return;
    }

    const songToPlay = this.queue[0];

    let voiceConnection = getVoiceConnection(this.guild?.id!);
    if (
      !voiceConnection ||
      voiceConnection.state.status == VoiceConnectionStatus.Disconnected ||
      voiceConnection.state.status == VoiceConnectionStatus.Destroyed
    ) {
      voiceConnection = joinVoiceChannel({
        channelId: this.voiceChannelId!,
        guildId: this.guild?.id!,
        adapterCreator: this.guild?.voiceAdapterCreator!,
        selfDeaf: true,
        selfMute: false,
        debug: false
      });
    }

    if (!this.player) {
      this.player = createAudioPlayer({
        debug: false
      });

      this.player.on(AudioPlayerStatus.Idle, () => {
        this.skip();
      });
    }

    const stream = ytdl(songToPlay.url, {
      filter: 'audioonly',
      dlChunkSize: 0
    });
    this.player.play(
      createAudioResource(stream, { inputType: StreamType.Arbitrary })
    );

    voiceConnection?.subscribe(this.player);

    this.textChannel?.send(
      `Now playing \`${songToPlay.title}\`, added by ${songToPlay.requestedBy}.`
    );
  }

  private async skip() {
    this.queue.shift();

    if (this.queue.length > 0) {
      this.player?.pause();
      this.textChannel?.send('Skipped.');
      this.play();
    } else {
      this.stop();
    }
  }
}

interface Song {
  title: string;
  url: string;
  requestedBy: string;
}
