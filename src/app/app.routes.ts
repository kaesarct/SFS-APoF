import { Routes } from '@angular/router';
import { Dashboard } from './dashboard/dashboard';
import { Methodology } from './methodology/methodology';
import { LinkSubmission } from './link-submission/link-submission';
import { Login } from './login/login';
import { Admin } from './admin/admin';
import { authGuard } from './auth-guard';

export const routes: Routes = [
  { path: '', component: Dashboard },
  { path: 'methodology', component: Methodology },
  { path: 'submit-link', component: LinkSubmission },
  { path: 'login', component: Login },
  { path: 'admin', component: Admin, canActivate: [authGuard] },
  { path: '**', redirectTo: '' }
];
