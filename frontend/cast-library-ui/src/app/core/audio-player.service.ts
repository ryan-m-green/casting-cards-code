import { Injectable } from '@angular/core';
import { signal, computed } from '@angular/core';
import { BehaviorSubject, Subject, Observable } from 'rxjs';
import { SoundtrackDomain } from '../shared/models/soundtrack.model';

export interface ActiveTrack {
  id: string;
  fileUrl: string;
  volume: number;
  isLoop: boolean;
  loopDelaySeconds?: number;
  audioElement: HTMLAudioElement;
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
