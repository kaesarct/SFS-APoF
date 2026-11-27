import { Routes } from '@angular/router';
import { authGuard } from './auth-guard';

const NOINDEX = 'noindex, nofollow';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./dashboard/dashboard').then(m => m.Dashboard),
    title: $localize`:@@route.home.title:Indice Nutella: quanto lavori per 100 g di Nutella nel mondo`,
    data: { description: $localize`:@@route.home.description:Confronta il prezzo della Nutella nel mondo e scopri quanti minuti di lavoro servono per comprarne 100 g in ogni Paese.` }
  },
  {
    path: 'methodology',
    loadComponent: () => import('./methodology/methodology').then(m => m.Methodology),
    title: $localize`:@@route.methodology.title:Metodologia · Indice Nutella`,
    data: { description: $localize`:@@route.methodology.description:Come si calcola l'Indice Nutella: prezzi raccolti sul campo, conversione in euro, PIL pro capite e minuti di lavoro per 100 g.` }
  },
  {
    path: 'ppp-index',
    loadComponent: () => import('./ppp-index/ppp-index').then(m => m.PppIndex),
    title: $localize`:@@route.ppp.title:Calcolatore PPP con la Nutella · Indice Nutella`,
    data: { description: $localize`:@@route.ppp.description:Inserisci il prezzo locale di un vasetto di Nutella e scopri se la valuta del Paese è sopravvalutata o sottovalutata rispetto all'euro.` }
  },
  {
    path: 'instant-calculator',
    loadComponent: () => import('./instant-calculator/instant-calculator').then(m => m.InstantCalculator),
    title: $localize`:@@route.calculator.title:Minuti di lavoro per 100 g di Nutella · Indice Nutella`,
    data: { description: $localize`:@@route.calculator.description:Calcola quanti minuti di lavoro servono per comprare 100 g di Nutella in un Paese e cosa compreresti in Italia con lo stesso tempo.` }
  },
  {
    path: 'equivalency',
    redirectTo: 'instant-calculator',
    pathMatch: 'full'
  },
  {
    path: 'submit-link',
    loadComponent: () => import('./link-submission/link-submission').then(m => m.DataSubmission),
    title: $localize`:@@route.submit.title:Invia una rilevazione di prezzo · Indice Nutella`,
    data: { description: $localize`:@@route.submit.description:Hai trovato la Nutella all'estero? Invia prezzo, peso e città: dopo la verifica la rilevazione entra nell'Indice Nutella.` }
  },
  {
    path: 'login',
    loadComponent: () => import('./login/login').then(m => m.Login),
    title: $localize`:@@route.login.title:Area amministratore · Indice Nutella`,
    data: { robots: NOINDEX }
  },
  {
    path: 'admin',
    loadComponent: () => import('./admin/admin').then(m => m.Admin),
    canActivate: [authGuard],
    title: $localize`:@@route.admin.title:Area amministratore · Indice Nutella`,
    data: { robots: NOINDEX }
  },
  {
    path: '**',
    loadComponent: () => import('./not-found/not-found').then(m => m.NotFound),
    title: $localize`:@@route.notFound.title:Pagina non trovata · Indice Nutella`,
    data: { robots: NOINDEX }
  }
];
