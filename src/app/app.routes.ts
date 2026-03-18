import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Methodology } from './methodology/methodology';
import { DataSubmission } from './link-submission/link-submission';
import { Login } from './login/login';
import { Admin } from './admin/admin';
import { PppIndex } from './ppp-index/ppp-index';
import { EquivalencyPage } from './equivalency/equivalency';
import { InstantCalculator } from './instant-calculator/instant-calculator';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'methodology', component: Methodology },
  { path: 'submit-link', component: DataSubmission },
  { path: 'login', component: Login },
  { path: 'ppp-index', component: PppIndex },
  { path: 'equivalency', component: EquivalencyPage },
  { path: 'instant-calculator', component: InstantCalculator },
  { path: 'admin', component: Admin, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
