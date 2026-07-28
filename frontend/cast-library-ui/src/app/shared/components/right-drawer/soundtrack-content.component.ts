import { Component, inject, signal, OnInit, input, OnDestroy, effect } from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AudioPlayerService } from '../../../core/audio-player.service';
import { SoundtrackDomain } from '../../models/soundtrack.model';
import { environment } from '../../../../environments/environment';
import { SoundtrackSyncService } from '../../../core/soundtrack-sync.service';

@Component({
  selector: 'app-soundtrack-content',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './soundtrack-content.component.html',
  styleUrl: './soundtrack-content.component.scss'
})
export class SoundtrackContentComponent implements OnInit, OnDestroy {
  private audioPlayer = inject(AudioPlayerService);
  private http = inject(HttpClient);
  private soundtrackSync = inject(SoundtrackSyncService);
  private subscriptions: Subscription[] = [];

  campaignId = input.required<string>();
  portalColor = input<string>('#6e28d0');
  masterVolume = signal(100);
  activeTrackCount = signal(0);
  
  soundtracks = signal<SoundtrackDomain[]>([]);
  activeTrackIds = signal<string[]>([]);

  constructor() {
    // Watch refresh trigger signal
    effect(() => {
      this.soundtrackSync.refreshTrigger$();
      const id = this.campaignId();
      if (id) {
        this.loadSoundtracks(id);
      }
    });
  }

  ngOnInit() {
    // Subscribe to master volume from audio player service
    this.subscriptions.push(
      this.audioPlayer.masterVolume$.subscribe((volume: number) => {
        this.masterVolume.set(volume);
      })
    );

    // Subscribe to active track IDs from audio player service
    this.subscriptions.push(
      this.audioPlayer.activeTrackIds$.subscribe((ids: string[]) => {
        this.activeTrackIds.set(ids);
        this.activeTrackCount.set(ids.length);
      })
    );

    // Load soundtracks initially
    this.loadSoundtracks(this.campaignId());
  }

  ngOnDestroy() {
    this.subscriptions.forEach((sub: Subscription) => sub.unsubscribe());
  }

  loadSoundtracks(id: string) {
    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/soundtracks`).subscribe({
      next: (tracks: SoundtrackDomain[]) => {
        this.soundtracks.set(tracks);
      }
    });
  }

  onVolumeChange(event: Event) {
    const value = (event.target as HTMLInputElement).valueAsNumber;
    this.masterVolume.set(value);
    this.audioPlayer.setMasterVolume(value);
  }

  stopAll() {
    this.audioPlayer.stopAllTracks();
  }

  playTrack(track: SoundtrackDomain) {
    this.audioPlayer.playTrack(track);
  }

  stopTrack(trackId: string) {
    this.audioPlayer.stopTrack(trackId);
  }

  isTrackPlaying(trackId: string): boolean {
    return this.activeTrackIds().includes(trackId);
  }

  getDisplayName(title: string): string {
    const lastDotIndex = title.lastIndexOf('.');
    return lastDotIndex > 0 ? title.substring(0, lastDotIndex) : title;
  }
}
