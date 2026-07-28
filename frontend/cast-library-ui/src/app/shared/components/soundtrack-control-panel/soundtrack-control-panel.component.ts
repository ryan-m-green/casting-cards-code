import { Component, inject, signal, computed, ViewChild, ElementRef, HostBinding, effect, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AudioPlayerService } from '../../../core/audio-player.service';
import { SoundtrackDomain } from '../../models/soundtrack.model';
import { environment } from '../../../../environments/environment';
import { SoundtrackSyncService } from '../../../core/soundtrack-sync.service';

@Component({
  selector: 'app-soundtrack-control-panel',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './soundtrack-control-panel.component.html',
  styleUrl: './soundtrack-control-panel.component.scss'
})
export class SoundtrackControlPanelComponent {
  private audioPlayer = inject(AudioPlayerService);
  private elementRef = inject(ElementRef);
  private http = inject(HttpClient);
  private soundtrackSync = inject(SoundtrackSyncService);

  @ViewChild('scpPanel') scpPanel!: ElementRef<HTMLDivElement>;

  @HostBinding('class.scp-animating')
  get isAnimatingClass() {
    return this.isOpen();
  }

  campaignId = input.required<string>();
  masterVolume = signal(100);
  activeTrackCount = signal(0);
  masterVolume$ = this.audioPlayer.masterVolume$;
  isOpen = signal(false);
  isClosing = signal(false);
  isAnimating = signal(false);
  openStateChange = output<boolean>();
  
  soundtracks = signal<SoundtrackDomain[]>([]);
  activeTrackIds = signal<string[]>([]);

  private readonly SLIDE_DURATION = 260;

  constructor() {
    effect(() => {
      // Track active track count changes
      this.activeTrackCount();
    });

    effect(() => {
      // Reload soundtracks when campaign ID changes
      const id = this.campaignId();
      if (id) {
        this.loadSoundtracks(id);
      }
    });

    effect(() => {
      // Reload soundtracks when sync service triggers refresh
      this.soundtrackSync.refreshTrigger$();
      const id = this.campaignId();
      if (id) {
        this.loadSoundtracks(id);
      }
    });

    // Subscribe to active track IDs from audio player service
    this.audioPlayer.activeTrackIds$.subscribe(ids => {
      this.activeTrackIds.set(ids);
      this.activeTrackCount.set(ids.length);
    });
  }

  ngOnInit() {
    this.audioPlayer.masterVolume$.subscribe(volume => {
      this.masterVolume.set(volume);
    });
  }

  loadSoundtracks(id: string) {
    this.http.get<SoundtrackDomain[]>(`${environment.apiUrl}/api/campaigns/${id}/soundtracks`).subscribe({
      next: (tracks) => {
        this.soundtracks.set(tracks);
      }
    });
  }

  toggle() {
    if (this.isOpen() && !this.isClosing()) {
      this.isClosing.set(true);
      setTimeout(() => {
        this.isOpen.set(false);
        this.isClosing.set(false);
        this.openStateChange.emit(false);
        // Reset mobile styles after slide-up animation completes
        if (window.innerWidth < 768) {
          const host = this.elementRef.nativeElement as HTMLElement;
          host.style.left = '';
          host.style.right = '';
          host.style.transform = '';
          host.style.width = '';
          host.style.maxWidth = '';
        }
      }, 100);
    } else if (!this.isOpen()) {
      this.isOpen.set(true);
      this.openStateChange.emit(true);
      this.isAnimating.set(true);
      // Clear any inline styles to ensure CSS takes effect
      const host = this.elementRef.nativeElement as HTMLElement;
      host.style.left = '';
      host.style.right = '';
      host.style.transform = '';
      host.style.width = '';
      host.style.maxWidth = '';
      // Apply mobile expansion immediately (no animation)
      if (window.innerWidth < 540) {
        host.style.left = '12px';
        host.style.right = '12px';
        host.style.transform = 'none';
        host.style.width = 'auto';
        host.style.maxWidth = 'none';
      }
      setTimeout(() => {
        this.isAnimating.set(false);
      }, this.SLIDE_DURATION);
    }
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
