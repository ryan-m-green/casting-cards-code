import { Routes } from '@angular/router';
import { adminGuard, authGuard, coverGuard, dmGuard, playerGuard, subscriptionLockGuard, libraryAccessGuard, playerLibraryAccessGuard, campaignShellAccessGuard, subscriptionChoiceGuard } from './core/auth/auth.guard';
import { JournalShellComponent } from './layout/journal-shell/journal-shell.component';
import { ProductShellComponent } from './layout/product-shell/product-shell.component';

export const routes: Routes = [
  {
    path: 'about',
    component: ProductShellComponent,
    children: [
      {
        path: '',
        loadComponent: () => import('./features/about/about.component').then(m => m.AboutComponent),
      }
    ],
  },
  {
    path: 'campaign/:id',
    canActivate: [authGuard, campaignShellAccessGuard],
    loadComponent: () => import('./layout/campaign-shell/campaign-shell.component').then(m => m.CampaignShellComponent),
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
        path: 'legal',
        loadComponent: () => import('./features/legal/legal.component').then(m => m.LegalComponent),
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
        path: 'verification',
        loadComponent: () => import('./features/verify-email/verify-email.component').then(m => m.VerifyEmailComponent),
      },
      {
        path: 'subscription-choice',
        canActivate: [authGuard],
        canDeactivate: [subscriptionChoiceGuard],
        loadComponent: () => import('./features/subscription-choice/subscription-choice.component').then(m => m.SubscriptionChoiceComponent),
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
            path: 'account-settings',
            canActivate: [playerLibraryAccessGuard],
            loadComponent: () => import('./features/change-password/change-password.component').then(m => m.ChangePasswordComponent),
          },
          {
            path: 'bug-report',
            canActivate: [playerLibraryAccessGuard],
            loadComponent: () => import('./features/bug-report/bug-report.component').then(m => m.BugReportComponent),
          },
          { path: '', redirectTo: 'campaigns', pathMatch: 'full' },
        ],
      },
      {
        path: 'gm',
        canActivate: [dmGuard],
        children: [
          {
            path: 'dashboard',
            loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
          },
          {
            path: 'cast',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/cast/cast-library/cast-library.component').then(m => m.CastLibraryComponent),
          },
          {
            path: 'cast/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/cast/cast-form/cast-form.component').then(m => m.CastFormComponent),
          },
          {
            path: 'cast/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/cast/cast-form/cast-form.component').then(m => m.CastFormComponent),
          },
          {
            path: 'locations',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/location/location-library/location-library.component').then(m => m.LocationLibraryComponent),
          },
          {
            path: 'locations/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/location/location-form/location-form.component').then(m => m.LocationFormComponent),
          },
          {
            path: 'locations/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/location/location-form/location-form.component').then(m => m.LocationFormComponent),
          },
          {
            path: 'campaigns',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/campaign/campaign-library/campaign-library.component').then(m => m.CampaignLibraryComponent),
          },
          {
            path: 'campaigns/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/campaign/campaign-creator/campaign-creator.component').then(m => m.CampaignCreatorComponent),
          },
          {
            path: 'campaigns/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/campaign/campaign-creator/campaign-creator.component').then(m => m.CampaignCreatorComponent),
          },

          {
            path: 'sublocations',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/sublocations/sublocation-library/sublocation-library.component').then(m => m.SublocationLibraryComponent),
          },
          {
            path: 'sublocations/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/sublocations/sublocation-form/sublocation-form.component').then(m => m.SublocationFormComponent),
          },
          {
            path: 'sublocations/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/sublocations/sublocation-form/sublocation-form.component').then(m => m.SublocationFormComponent),
          },
          {
            path: 'faction',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/faction/faction-library/faction-library.component').then(m => m.FactionLibraryComponent),
          },
          {
            path: 'faction/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/faction/faction-form/faction-form.component').then(m => m.FactionFormComponent),
          },
          {
            path: 'faction/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/faction/faction-form/faction-form.component').then(m => m.FactionFormComponent),
          },
          {
            path: 'conditions',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/condition/condition-library/condition-library.component').then(m => m.ConditionLibraryComponent),
          },
          {
            path: 'conditions/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/condition/condition-form/condition-form.component').then(m => m.ConditionFormComponent),
          },
          {
            path: 'conditions/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/condition/condition-form/condition-form.component').then(m => m.ConditionFormComponent),
          },
          {
            path: 'soundtracks',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/soundtrack/soundtrack-library/soundtrack-library.component').then(m => m.SoundtrackLibraryComponent),
          },
          {
            path: 'soundtracks/track/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/soundtrack/soundtrack-form/soundtrack-form.component').then(m => m.SoundtrackFormComponent),
          },
          {
            path: 'soundtracks/ambiance/new',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/soundtrack/ambiance-form/ambiance-form.component').then(m => m.AmbianceFormComponent),
          },
          {
            path: 'soundtracks/ambiance/:id',
            canActivate: [subscriptionLockGuard],
            loadComponent: () => import('./features/soundtrack/ambiance-form/ambiance-form.component').then(m => m.AmbianceFormComponent),
          },
          {
            path: 'account-settings',
            canActivate: [libraryAccessGuard],
            loadComponent: () => import('./features/change-password/change-password.component').then(m => m.ChangePasswordComponent),
          },
          {
            path: 'bug-report',
            canActivate: [libraryAccessGuard],
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
            path: 'user-management',
            loadComponent: () => import('./features/admin/user-management/user-management.component').then(m => m.UserManagementComponent),
          },
          {
            path: 'bug-reports',
            loadComponent: () => import('./features/admin/admin-bug-reports/admin-bug-reports.component').then(m => m.AdminBugReportsComponent),
          },
          {
            path: 'configuration-settings',
            loadComponent: () => import('./features/admin/configuration-settings/configuration-settings.component').then(m => m.ConfigurationSettingsComponent),
          },
          { path: '', redirectTo: 'user-management', pathMatch: 'full' },
        ],
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
