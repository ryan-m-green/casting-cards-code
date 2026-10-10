import { Injectable } from '@angular/core';
import { signal, computed } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { SoundtrackDomain, AmbianceDomain, AmbianceItemDomain } from '../shared/models/soundtrack.model';

export interface ActiveTrack {
  id: string;
  fileUrl: string;
  volume: number;
  isLoop: boolean;
  loopDelaySeconds?: number;
  audioElement: HTMLAudioElement;
}

interface ActiveAmbianceAudio {
  audio: HTMLAudioElement;
  volume: number;
}

interface ActiveAmbianceState {
  timers: number[];
  audios: ActiveAmbianceAudio[];
}

@Injectable({
  providedIn: 'root'
})
export class AudioPlayerService {
  private activeTracks = new Map<string, ActiveTrack>();
  private masterVolume = new BehaviorSubject<number>(100);
  private fadeTransitionMs = 500;
  private activeTrackIdsSubject = new BehaviorSubject<string[]>([]);

  masterVolume$ = this.masterVolume.asObservable();
  activeTrackCount = computed(() => this.activeTracks.size);
  activeTrackIds$ = this.activeTrackIdsSubject.asObservable();

  private activeAmbiances = new Map<string, ActiveAmbianceState>();
  private activeAmbianceIdsSubject = new BehaviorSubject<string[]>([]);
  activeAmbianceIds$ = this.activeAmbianceIdsSubject.asObservable();

  private trackStartedSubject = new Subject<{ id: string; title: string }>();
  trackStarted$ = this.trackStartedSubject.asObservable();

  private trackStoppedSubject = new Subject<string>();
  trackStopped$ = this.trackStoppedSubject.asObservable();

  playTrack(soundtrack: SoundtrackDomain): void {
    if (this.activeTracks.has(soundtrack.id)) {
      this.stopTrack(soundtrack.id);
    }

    const audio = new Audio(soundtrack.fileUrl);
    audio.volume = (soundtrack.volume / 100) * (this.masterVolume.value / 100);
    
    // Don't use native loop property - use custom loop for seamless playback
    audio.loop = false;

    const activeTrack: ActiveTrack = {
      id: soundtrack.id,
      fileUrl: soundtrack.fileUrl,
      volume: soundtrack.volume,
      isLoop: soundtrack.isLoop,
      loopDelaySeconds: soundtrack.loopDelaySeconds,
      audioElement: audio
    };

    this.activeTracks.set(soundtrack.id, activeTrack);
    this.activeTrackIdsSubject.next(Array.from(this.activeTracks.keys()));
    
    // If delay is set (without loop), wait before first play, then stop when done
    if (soundtrack.loopDelaySeconds && !soundtrack.isLoop) {
      setTimeout(() => {
        if (this.activeTracks.has(soundtrack.id)) {
          audio.play().catch(error => {
            console.error('Failed to play audio:', error);
            this.activeTracks.delete(soundtrack.id);
            this.activeTrackIdsSubject.next(Array.from(this.activeTracks.keys()));
          });
          this.trackStartedSubject.next({ id: soundtrack.id, title: soundtrack.title });
        }
      }, soundtrack.loopDelaySeconds * 1000);
    } else {
      // Play immediately (either looping or non-looping without delay)
      audio.play().catch(error => {
        console.error('Failed to play audio:', error);
        this.activeTracks.delete(soundtrack.id);
        this.activeTrackIdsSubject.next(Array.from(this.activeTracks.keys()));
      });
      this.trackStartedSubject.next({ id: soundtrack.id, title: soundtrack.title });
    }

    audio.onended = () => {
      if (activeTrack.isLoop) {
        // Seamless loop without fade - restart immediately
        if (this.activeTracks.has(soundtrack.id)) {
          audio.currentTime = 0;
          audio.play().catch(error => {
            console.error('Failed to replay audio:', error);
            this.stopTrack(soundtrack.id);
          });
        }
      } else {
        // Non-looping track - stop when done
        this.stopTrack(soundtrack.id);
      }
    };
  }

  playAmbiance(ambiance: AmbianceDomain, soundtracks: SoundtrackDomain[]): void {
    this.stopAmbiance(ambiance.id);

    const state: ActiveAmbianceState = { timers: [], audios: [] };
    this.activeAmbiances.set(ambiance.id, state);
    this.activeAmbianceIdsSubject.next(Array.from(this.activeAmbiances.keys()));

    const resolved = ambiance.items
      .map(item => ({ item, soundtrack: soundtracks.find(s => s.id === item.soundtrackId) }))
      .filter((x): x is { item: AmbianceItemDomain; soundtrack: SoundtrackDomain } => !!x.soundtrack);

    if (resolved.length === 0) {
      this.stopAmbiance(ambiance.id);
      return;
    }

    const music = resolved.filter(x => x.soundtrack.kind === 'music');

    if (ambiance.randomizeMusic) {
      for (let i = music.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [music[i], music[j]] = [music[j], music[i]];
      }
    }

    // Music: play sequentially in server order, looping the list.
    if (music.length > 0) {
      const playMusic = (index: number) => {
        if (!this.activeAmbiances.has(ambiance.id)) return;

        const entry = music[index % music.length];
        const soundtrack = entry.soundtrack;
        const volume = soundtrack.volume;
        const audio = new Audio(soundtrack.fileUrl);
        audio.volume = (volume / 100) * (this.masterVolume.value / 100);
        audio.loop = false;
        state.audios.push({ audio, volume });

        audio.onended = () => {
          this.removeAmbianceAudio(state, audio);
          if (this.activeAmbiances.has(ambiance.id)) {
            playMusic(index + 1);
          }
        };

        audio.play().catch(() => {
          this.removeAmbianceAudio(state, audio);
          if (this.activeAmbiances.has(ambiance.id)) {
            playMusic(index + 1);
          }
        });
      };

      playMusic(0);
    }

    // Sound effects: play all simultaneously, each on its own schedule.
    for (const { item, soundtrack } of resolved.filter(x => x.soundtrack.kind === 'sound_effect')) {
      const volume = soundtrack.volume;
      const playSfx = () => {
        if (!this.activeAmbiances.has(ambiance.id)) return;

        const audio = new Audio(soundtrack.fileUrl);
        audio.volume = (volume / 100) * (this.masterVolume.value / 100);
        audio.loop = false;
        state.audios.push({ audio, volume });

        audio.onended = () => {
          this.removeAmbianceAudio(state, audio);
          this.scheduleNextSfx(state, ambiance.id, item, playSfx);
        };

        audio.play().catch(() => {
          this.removeAmbianceAudio(state, audio);
          this.scheduleNextSfx(state, ambiance.id, item, playSfx);
        });
      };

      playSfx();
    }
  }

  private scheduleNextSfx(
    state: ActiveAmbianceState,
    ambianceId: string,
    item: AmbianceItemDomain,
    playSfx: () => void
  ): void {
    if (!this.activeAmbiances.has(ambianceId)) return;

    let delaySeconds: number | null = null;
    if (item.pauseMode === 'manual' && item.pauseDelaySeconds != null) {
      delaySeconds = item.pauseDelaySeconds;
    } else if (
      item.pauseMode === 'random' &&
      item.pauseMinSeconds != null &&
      item.pauseMaxSeconds != null
    ) {
      delaySeconds =
        item.pauseMinSeconds + Math.random() * (item.pauseMaxSeconds - item.pauseMinSeconds);
    }

    if (delaySeconds == null) return; // 'none' -> play once, no repeat

    const timer = window.setTimeout(playSfx, delaySeconds * 1000);
    state.timers.push(timer);
  }

  stopAmbiance(ambianceId: string): void {
    const state = this.activeAmbiances.get(ambianceId);
    if (!state) return;

    state.timers.forEach(timer => window.clearTimeout(timer));
    state.audios.forEach(({ audio }) => {
      audio.pause();
      audio.currentTime = 0;
    });

    this.activeAmbiances.delete(ambianceId);
    this.activeAmbianceIdsSubject.next(Array.from(this.activeAmbiances.keys()));
  }

  isAmbiancePlaying(ambianceId: string): boolean {
    return this.activeAmbiances.has(ambianceId);
  }

  private removeAmbianceAudio(state: ActiveAmbianceState, audio: HTMLAudioElement): void {
    const index = state.audios.findIndex(a => a.audio === audio);
    if (index !== -1) {
      state.audios.splice(index, 1);
    }
  }

  stopTrack(trackId: string): void {
    const track = this.activeTracks.get(trackId);
    if (track) {
      this.fadeOut(track.audioElement).then(() => {
        track.audioElement.pause();
        track.audioElement.currentTime = 0;
        this.activeTracks.delete(trackId);
        this.activeTrackIdsSubject.next(Array.from(this.activeTracks.keys()));
        this.trackStoppedSubject.next(trackId);
      });
    }
  }

  setTrackVolume(trackId: string, volume: number): void {
    const track = this.activeTracks.get(trackId);
    if (track) {
      track.volume = volume;
      track.audioElement.volume = (volume / 100) * (this.masterVolume.value / 100);
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume.next(volume);
    this.activeTracks.forEach(track => {
      track.audioElement.volume = (track.volume / 100) * (volume / 100);
    });
    this.activeAmbiances.forEach(state => {
      state.audios.forEach(({ audio, volume: trackVolume }) => {
        audio.volume = (trackVolume / 100) * (volume / 100);
      });
    });
  }

  updateTrackVolume(trackId: string, volume: number): void {
    const track = this.activeTracks.get(trackId);
    if (track) {
      track.volume = volume;
      track.audioElement.volume = (volume / 100) * (this.masterVolume.value / 100);
    }
  }

  updateTrackLoop(trackId: string, isLoop: boolean, loopDelaySeconds?: number): void {
    const track = this.activeTracks.get(trackId);
    if (track) {
      track.isLoop = isLoop;
      track.loopDelaySeconds = loopDelaySeconds;
      
      // Update native loop property
      if (isLoop && !loopDelaySeconds) {
        track.audioElement.loop = true;
      } else {
        track.audioElement.loop = false;
      }
    }
  }

  stopAllTracks(): void {
    const promises = Array.from(this.activeTracks.values()).map(track => 
      this.fadeOut(track.audioElement).then(() => {
        track.audioElement.pause();
        track.audioElement.currentTime = 0;
      })
    );

    Promise.all(promises).then(() => {
      this.activeTracks.clear();
      this.activeTrackIdsSubject.next([]);
    });
  }

  private async fadeOut(audio: HTMLAudioElement): Promise<void> {
    const startVolume = audio.volume;
    const steps = 20;
    const stepDuration = this.fadeTransitionMs / steps;

    for (let i = 0; i < steps; i++) {
      audio.volume = startVolume * (1 - (i / steps));
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    audio.volume = 0;
  }

  private async fadeIn(audio: HTMLAudioElement, targetVolume: number): Promise<void> {
    audio.volume = 0;
    const steps = 20;
    const stepDuration = this.fadeTransitionMs / steps;

    for (let i = 0; i < steps; i++) {
      audio.volume = targetVolume * (i / steps);
      await new Promise(resolve => setTimeout(resolve, stepDuration));
    }
    audio.volume = targetVolume;
  }
}
