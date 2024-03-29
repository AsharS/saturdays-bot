import logger from '../logger/winston';
import { Guild, Message, EmbedBuilder, TextChannel } from 'discord.js';
import {
  AudioPlayer,
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
  StreamType,
  VoiceConnectionStatus
} from '@discordjs/voice';
import ytdl from 'ytdl-core';
import ytsr, { Video } from 'ytsr';
import { Song } from './song';

export class MusicService {
  private queue: Song[] = [];
  private textChannel?: TextChannel;
  private guild?: Guild;
  private voiceChannelId?: string;
  private player?: AudioPlayer;
  private timer?: NodeJS.Timeout;

  public parseMessage(prefix: string, message: Message) {
    this.textChannel = message.channel as TextChannel;
    const content = message.content.substr(
      prefix.length,
      message.content.length
    );
    const messageArray = content.split(' ');
    const command = messageArray.shift();
    const term = messageArray.join(' ').trim();

    switch (command) {
      case 'play':
        if (term.length === 0) {
          break;
        }
        this.addSong(term, message);
        break;
      case 'skip':
        this.next(true);
        break;
      case 'stop':
        this.stop(true);
        break;
    }
  }

  public async stop(disconnect = false) {
    this.queue = [];
    if (disconnect) {
      this.disconnect();
    } else {
      this.timer = setTimeout(() => {
        this.disconnect();
      }, 300000);
    }
    if (this.voiceChannelId) {
      this.textChannel?.send('Finished playing.');
    }
    this.voiceChannelId = undefined;
  }

  private disconnect() {
    if (this.guild?.id) {
      getVoiceConnection(this.guild.id)?.destroy();
    }
  }

  private async addSong(term: string, message: Message) {
    if (!message.guild || !message.member) {
      return;
    }

    this.guild = message.guild;
    this.voiceChannelId = message.member?.voice.channel?.id;

    if (this.voiceChannelId) {
      const result = await this.search(term);

      if (result) {
        this.queue.push({
          title: result.title,
          url: result.url,
          duration: result.duration || '',
          thumbnailURL: result.bestThumbnail.url || '',
          requestedBy: message.member?.displayName
        });

        this.play();
      } else {
        message.reply(`Could not find any videos matching \`${term}\`.`);
      }
    } else {
      message.reply("You're a bigger bot than me, get in a voice channel.");
    }
  }

  private async play() {
    if (!this.guild) {
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }

    if (this.player && this.player.state.status == AudioPlayerStatus.Playing) {
      const lastSong = this.queue[this.queue.length - 1];
      this.textChannel?.send(
        `Added \`${this.getSongName(lastSong)}\` to the queue.`
      );
      return;
    }

    const songToPlay = this.queue[0];

    let voiceConnection = getVoiceConnection(this.guild.id);
    if (
      this.voiceChannelId &&
      (!voiceConnection ||
        voiceConnection.state.status == VoiceConnectionStatus.Disconnected ||
        voiceConnection.state.status == VoiceConnectionStatus.Destroyed)
    ) {
      voiceConnection = joinVoiceChannel({
        channelId: this.voiceChannelId,
        guildId: this.guild.id,
        adapterCreator: this.guild.voiceAdapterCreator,
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
        this.next();
      });

      this.player.on('error', (err) => {
        logger.error(err);
        this.next(true);
      });
    }

    const stream = ytdl(songToPlay.url, {
      filter: 'audioonly',
      quality: 'highestaudio',
      liveBuffer: 20000,
      highWaterMark: 1024 * 512
    });

    stream.on('error', (err) => {
      if (err) {
        logger.error(err);
        this.next(true);
      }
    });

    this.player.play(
      createAudioResource(stream, { inputType: StreamType.Arbitrary })
    );

    voiceConnection?.subscribe(this.player);

    this.textChannel?.send({ embeds: [this.getNowPlayingMessage(songToPlay)] });
  }

  private async next(skipped?: boolean) {
    this.queue.shift();

    if (this.queue.length > 0) {
      this.player?.pause();

      if (skipped) {
        this.textChannel?.send('Skipped.');
      }

      this.play();
    } else {
      this.stop(false);
    }
  }

  private async search(term: string): Promise<Video | undefined> {
    const filters = await ytsr.getFilters(term, {
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
        return result.items.find((item) => !(item as Video).isLive) as
          | Video
          | undefined;
      }
    }

    return;
  }

  private getNowPlayingMessage(songToPlay: Song) {
    const embedMessage = new EmbedBuilder();
    embedMessage.setAuthor({ name: 'Now Playing' });
    embedMessage.setTitle(songToPlay.title);
    embedMessage.setURL(songToPlay.url);
    embedMessage.addFields([
      {
        name: 'Duration',
        value: songToPlay.duration,
        inline: true
      },
      {
        name: 'Requested By',
        value: songToPlay.requestedBy,
        inline: true
      }
    ]);
    embedMessage.setImage(songToPlay.thumbnailURL);

    return embedMessage;
  }

  private getSongName(songToPlay: Song) {
    const name = songToPlay.title;
    const duration = songToPlay.duration ? ` [${songToPlay.duration}]` : '';

    return name + duration;
  }
}
