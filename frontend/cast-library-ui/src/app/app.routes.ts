import { Routes } from '@angular/router';
import { adminGuard, authGuard, coverGuard, dmGuard, playerGuard } from './core/auth/auth.guard';
import { JournalShellComponent } from './layout/journal-shell/journal-shell.component';

export const routes: Routes = [
  {
    path: 'campaign/:id',
    canActivate: [authGuard],
    loadComponent: () => import('./features/campaign/campaign-detail/campaign-detail.component').then(m => m.CampaignDetailComponent),
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
        path: 'cities/:cityInstanceId',
        loadComponent: () => import('./features/player/player-city-detail/player-city-detail.component').then(m => m.PlayerCityDetailComponent),
      },
      {
        path: 'sublocations/:sublocationInstanceId',
        loadComponent: () => import('./features/player/player-sublocation-detail/player-sublocation-detail.component').then(m => m.PlayerSublocationDetailComponent),
      },
      {
        path: 'sublocations/:sublocationInstanceId/cast/:castInstanceId',
        loadComponent: () => import('./features/player/player-cast-detail/player-cast-detail.component').then(m => m.PlayerCastDetailComponent),
      },
    ],
  },
  {
    path: 'campaign/:id/cities/:cityInstanceId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/campaign/campaign-city-detail/campaign-city-detail.component').then(m => m.CampaignCityDetailComponent),
  },
  {
    path: 'campaign/:id/sublocations/:sublocationInstanceId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/campaign/campaign-sublocation-detail/campaign-sublocation-detail.component').then(m => m.CampaignSublocationDetailComponent),
  },
  {
    path: 'campaign/:id/sublocations/:sublocationInstanceId/cast/:castInstanceId',
    canActivate: [authGuard],
    loadComponent: () => import('./features/campaign/campaign-cast-detail/campaign-cast-detail.component').then(m => m.CampaignCastDetailComponent),
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
            path: 'cities',
            loadComponent: () => import('./features/city/city-library/city-library.component').then(m => m.CityLibraryComponent),
          },
          {
            path: 'cities/new',
            loadComponent: () => import('./features/city/city-form/city-form.component').then(m => m.CityFormComponent),
          },
          {
            path: 'cities/:id',
            loadComponent: () => import('./features/city/city-form/city-form.component').then(m => m.CityFormComponent),
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
            path: 'campaigns/:id/cities/:cityId/sublocations',
            loadComponent: () => import('./features/campaign/campaign-sublocation-selector/campaign-sublocation-selector.component').then(m => m.CampaignSublocationSelectorComponent),
          },
          {
            path: 'campaigns/:id/cities/:cityId/sublocations/:sublocationInstanceId/cast',
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
          { path: '', redirectTo: 'invite-code', pathMatch: 'full' },
        ],
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
