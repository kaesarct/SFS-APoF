import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp, getApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, provideAppCheck } from '@angular/fire/app-check';
import { provideEchartsCore } from 'ngx-echarts';

import { environment } from '../environments/environment';

// reCAPTCHA needs a real browser: during the build-time prerender there is no window, so App Check is skipped.
const isBrowser = typeof window !== 'undefined';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withFetch()),
    provideClientHydration(withEventReplay()),
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    ...(isBrowser
      ? [provideAppCheck(() => {
          const provider = new ReCaptchaV3Provider(environment.recaptcha.siteKey);
          return initializeAppCheck(getApp(), { provider, isTokenAutoRefreshEnabled: true });
        })]
      : []),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    provideEchartsCore({ echarts: () => import('./echarts-setup').then(m => m.default) })
  ]
};
