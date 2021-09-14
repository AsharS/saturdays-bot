import { Guild, Message, TextChannel } from "discord.js";
import { AudioPlayer, AudioPlayerStatus, createAudioPlayer, createAudioResource, getVoiceConnection, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus } from '@discordjs/voice';
import ytdl from 'ytdl-core';

export class MusicService {
  private queue: Song[] = [];
  private textChannel?: TextChannel;
  private guild?: Guild;
  private voiceChannelId?: string;
  private player?: AudioPlayer;

  parseMessage(prefix: string, message: Message) {
    this.textChannel = message.channel as TextChannel;
    const content = message.content.substr(prefix.length, message.content.length);
    const messageArray = content.split(' ');

    switch (messageArray[0]) {
      case 'play':
        this.addSong(messageArray[1], message);
        break;
      case 'skip':
        this.skip();
        break;
      case 'stop':
        this.stop();
        break;
    }
  }

  private async addSong(url: string, message: Message) {
    if (!message.guild || !message.member) {
      return;
    }

    this.guild = message.guild;
    this.voiceChannelId = message.member?.voice.channel?.id;

    if (this.voiceChannelId) {
      const songInfo = await ytdl.getInfo(url);

      if (songInfo) {
        this.queue.push({
          title: songInfo.videoDetails.title,
          url: songInfo.videoDetails.video_url,
          requestedBy: message.member?.displayName
        });

        this.play();
      }
    }
  }

  private async play() {
    const songToPlay = this.queue[0];

    if (this.player && this.player.state.status == AudioPlayerStatus.Playing) {
      this.textChannel?.send(`Added \`${songToPlay.title}\` to the queue.`);
      return;
    }

    let voiceConnection = getVoiceConnection(this.guild?.id!);
    if (!voiceConnection || voiceConnection.state.status == VoiceConnectionStatus.Disconnected || voiceConnection.state.status == VoiceConnectionStatus.Destroyed) {
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
    this.player.play(createAudioResource(stream, { inputType: StreamType.Arbitrary }));

    voiceConnection?.subscribe(this.player);

    this.textChannel?.send(`Now playing \`${songToPlay.title}\`.`);
  }

  private async skip() {
    this.queue.shift();
        
    if (this.queue.length > 0) {
      this.play();
    } else {
      getVoiceConnection(this.guild?.id!)?.destroy();
    }
  }

  private async stop() {
    getVoiceConnection(this.guild?.id!)?.destroy();
  }
}

interface Song {
  title: string;
  url: string;
  requestedBy: string;
}