import { Routes } from '@angular/router';
import { adminGuard, authGuard, coverGuard, dmGuard, playerGuard } from './core/auth/auth.guard';
import { JournalShellComponent } from './layout/journal-shell/journal-shell.component';

export const routes: Routes = [
  {
    path: 'campaign/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/campaign/campaign-shell/campaign-shell.component').then(m => m.CampaignShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/campaign/campaign-detail/campaign-detail.component').then(m => m.CampaignDetailComponent),
      },
      {
        path: 'the-party',
        canActivate: [dmGuard],
        loadComponent: () => import('./features/campaign/dm-the-party/dm-the-party.component').then(m => m.DmThePartyComponent),
      },
      {
        path: 'locations/:locationInstanceId',
        loadComponent: () => import('./features/campaign/campaign-location-detail/campaign-location-detail.component').then(m => m.CampaignLocationDetailComponent),
      },
      {
        path: 'sublocations/:sublocationInstanceId',
        loadComponent: () => import('./features/campaign/campaign-sublocation-detail/campaign-sublocation-detail.component').then(m => m.CampaignSublocationDetailComponent),
      },
      {
        path: 'sublocations/:sublocationInstanceId/cast/:castInstanceId',
        loadComponent: () => import('./features/campaign/campaign-cast-detail/campaign-cast-detail.component').then(m => m.CampaignCastDetailComponent),
      },
    ],
  },
  {
    path: 'player/campaign/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/player/player-campaign-shell/player-campaign-shell.component').then(m => m.PlayerCampaignShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        loadComponent: () => import('./features/player/player-campaign-detail/player-campaign-detail.component').then(m => m.PlayerCampaignDetailComponent),
      },
      {
        path: 'locations/:locationInstanceId',
        loadComponent: () => import('./features/player/player-location-detail/player-location-detail.component').then(m => m.PlayerLocationDetailComponent),
      },
      {
        path: 'sublocations/:sublocationInstanceId',
        loadComponent: () => import('./features/player/player-sublocation-detail/player-sublocation-detail.component').then(m => m.PlayerSublocationDetailComponent),
      },
      {
        path: 'sublocations/:sublocationInstanceId/cast/:castInstanceId',
        loadComponent: () => import('./features/player/player-cast-detail/player-cast-detail.component').then(m => m.PlayerCastDetailComponent),
      },
      {
        path: 'my-character',
        loadComponent: () => import('./features/player/player-my-character/player-my-character.component').then(m => m.PlayerMyCharacterComponent),
      },
      {
        path: 'player-card/new',
        loadComponent: () => import('./features/player/player-card-form/player-card-form.component').then(m => m.PlayerCardFormComponent),
      },
    ],
  },
  {
    path: '',
    component: JournalShellComponent,
    children: [
      {
        path: '',
        canActivate: [coverGuard],
        loadComponent: () => import('./features/cover/cover.component').then(m => m.CoverComponent),
      },
      {
        path: 'join',
        loadComponent: () => import('./features/role-selection/role-selection.component').then(m => m.RoleSelectionComponent),
      },
      {
        path: 'about',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent),
      },
      {
        path: 'legal',
        loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent),
      },
      {
        path: 'subscribe',
        loadComponent: () => import('./features/subscribe/subscribe.component').then(m => m.SubscribeComponent),
      },
      {
        path: 'forgot-password',
        loadComponent: () => import('./features/forgot-password/forgot-password.component').then(m => m.ForgotPasswordComponent),
      },
      {
        path: 'reset-password',
        loadComponent: () => import('./features/reset-password/reset-password.component').then(m => m.ResetPasswordComponent),
      },
      {
        path: 'player',
        canActivate: [playerGuard],
        children: [
          {
            path: 'campaigns',
            loadComponent: () => import('./features/player/player-campaigns/player-campaigns.component').then(m => m.PlayerCampaignsComponent),
          },
          {
            path: 'bug-report',
            loadComponent: () => import('./features/bug-report/bug-report.component').then(m => m.BugReportComponent),
          },
          { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
        ],
      },
      {
        path: 'dm',
        canActivate: [dmGuard],
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
          },
          {
            path: 'cast',
            loadComponent: () => import('./features/cast/cast-library/cast-library.component').then(m => m.CastLibraryComponent),
          },
          {
            path: 'cast/new',
            loadComponent: () => import('./features/cast/cast-form/cast-form.component').then(m => m.CastFormComponent),
          },
          {
            path: 'cast/:id',
            loadComponent: () => import('./features/cast/cast-form/cast-form.component').then(m => m.CastFormComponent),
          },
          {
            path: 'locations',
            loadComponent: () => import('./features/location/location-library/location-library.component').then(m => m.LocationLibraryComponent),
          },
          {
            path: 'locations/new',
            loadComponent: () => import('./features/location/location-form/location-form.component').then(m => m.LocationFormComponent),
          },
          {
            path: 'locations/:id',
            loadComponent: () => import('./features/location/location-form/location-form.component').then(m => m.LocationFormComponent),
          },
          {
            path: 'campaigns',
            loadComponent: () => import('./features/campaign/campaign-library/campaign-library.component').then(m => m.CampaignLibraryComponent),
          },
          {
            path: 'campaigns/new',
            loadComponent: () => import('./features/campaign/campaign-creator/campaign-creator.component').then(m => m.CampaignCreatorComponent),
          },
          {
            path: 'campaigns/:id',
            loadComponent: () => import('./features/campaign/campaign-creator/campaign-creator.component').then(m => m.CampaignCreatorComponent),
          },
          {
            path: 'campaigns/:id/locations/:locationId/sublocations',
            loadComponent: () => import('./features/campaign/campaign-sublocation-selector/campaign-sublocation-selector.component').then(m => m.CampaignSublocationSelectorComponent),
          },
          {
            path: 'campaigns/:id/locations/:locationId/sublocations/:sublocationInstanceId/cast',
            loadComponent: () => import('./features/campaign/campaign-cast-editor/campaign-cast-editor.component').then(m => m.CampaignCastEditorComponent),
          },
          {
            path: 'sublocations',
            loadComponent: () => import('./features/sublocations/sublocation-library/sublocation-library.component').then(m => m.SublocationLibraryComponent),
          },
          {
            path: 'sublocations/new',
            loadComponent: () => import('./features/sublocations/sublocation-form/sublocation-form.component').then(m => m.SublocationFormComponent),
          },
          {
            path: 'sublocations/:id',
            loadComponent: () => import('./features/sublocations/sublocation-form/sublocation-form.component').then(m => m.SublocationFormComponent),
          },
          {
            path: 'change-password',
            loadComponent: () => import('./features/change-password/change-password.component').then(m => m.ChangePasswordComponent),
          },
          {
            path: 'gold-ledger',
            loadComponent: () => import('./features/gold-ledger/gold-ledger.component').then(m => m.GoldLedgerComponent),
          },
          {
            path: 'player-invites',
            loadComponent: () => import('./features/player-invites/player-invites.component').then(m => m.PlayerInvitesComponent),
          },
          {
            path: 'bug-report',
            loadComponent: () => import('./features/bug-report/bug-report.component').then(m => m.BugReportComponent),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: 'invite-code',
            loadComponent: () => import('./features/admin/admin-invite-code/admin-invite-code.component').then(m => m.AdminInviteCodeComponent),
          },
          {
            path: 'user-management',
            loadComponent: () => import('./features/admin/user-management/user-management.component').then(m => m.UserManagementComponent),
          },
          {
            path: 'bug-reports',
            loadComponent: () => import('./features/admin/admin-bug-reports/admin-bug-reports.component').then(m => m.AdminBugReportsComponent),
          },
          { path: '', redirectTo: 'invite-code', pathMatch: 'full' },
        ],
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
