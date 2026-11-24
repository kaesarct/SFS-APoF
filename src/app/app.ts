import { Component, LOCALE_ID, afterNextRender, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DOCUMENT } from '@angular/common';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterOutlet, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

const SITE_URL = 'https://lgrdg-a4a32.web.app';
const LOCALE_PREFIX: Record<string, string> = { it: '', en: '/en' };
const OG_LOCALE: Record<string, string> = { it: 'it_IT', en: 'en_GB' };
const SITE_NAME = $localize`:@@meta.siteName:Indice Nutella`;
const DATASET_DESCRIPTION = $localize`:@@meta.datasetDescription:Prezzi della Nutella rilevati sul campo in Paesi di tutto il mondo, convertiti in euro per 100 g e confrontati con il PIL pro capite per stimare i minuti di lavoro necessari e la sopra o sottovalutazione delle valute rispetto all'euro.`;
const DEFAULT_DESCRIPTION = $localize`:@@meta.defaultDescription:Indice Nutella: scopri il PPP della Nutella nel mondo. Calcola quanto tempo devi lavorare per poterti permettere 100g di Nutella nel tuo Paese.`;

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, CommonModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  private readonly language = inject(LOCALE_ID).startsWith('en') ? 'en' : 'it';
  protected readonly altLanguage = this.language === 'en' ? 'it' : 'en';
  protected readonly altLanguageHref = signal(LOCALE_PREFIX[this.altLanguage] || '/');

  cookieBannerVisible = signal(false);

  constructor() {
    const router = inject(Router);
    const meta = inject(Meta);
    const titleService = inject(Title);
    const document = inject(DOCUMENT);

    afterNextRender(() => this.cookieBannerVisible.set(!localStorage.getItem('cookie_consent')));

    router.events
      .pipe(filter(e => e instanceof NavigationEnd), takeUntilDestroyed())
      .subscribe(() => {
        let route = router.routerState.snapshot.root;
        while (route.firstChild) route = route.firstChild;

        const description = route.data['description'] ?? DEFAULT_DESCRIPTION;
        const pageTitle = route.title ?? titleService.getTitle();
        const path = '/' + (router.parseUrl(router.url).root.children['primary']?.toString() ?? '');
        // trailingSlash is disabled on Hosting, so the English home is /en and not /en/.
        const urlFor = (lang: string) => SITE_URL + (path === '/' ? LOCALE_PREFIX[lang] || '/' : LOCALE_PREFIX[lang] + path);
        const indexable = !route.data['robots'];

        meta.updateTag({ name: 'description', content: description });
        meta.updateTag({ name: 'robots', content: route.data['robots'] ?? 'index, follow' });
        meta.updateTag({ property: 'og:title', content: pageTitle });
        meta.updateTag({ property: 'og:description', content: description });
        meta.updateTag({ property: 'og:url', content: urlFor(this.language) });
        meta.updateTag({ property: 'og:locale', content: OG_LOCALE[this.language] });
        meta.updateTag({ name: 'twitter:card', content: 'summary' });
        meta.updateTag({ name: 'twitter:title', content: pageTitle });
        meta.updateTag({ name: 'twitter:description', content: description });

        this.setLink(document, 'canonical', undefined, urlFor(this.language));
        for (const lang of ['it', 'en']) this.setLink(document, 'alternate', lang, indexable ? urlFor(lang) : null);
        this.setLink(document, 'alternate', 'x-default', indexable ? urlFor('it') : null);

        this.setStructuredData(document, path === '/', urlFor);
        this.altLanguageHref.set(path === '/' ? LOCALE_PREFIX[this.altLanguage] || '/' : LOCALE_PREFIX[this.altLanguage] + path);
      });
  }

  private setStructuredData(document: Document, isHome: boolean, urlFor: (lang: string) => string) {
    const graph: object[] = [{
      '@type': 'WebSite',
      name: SITE_NAME,
      url: SITE_URL + (LOCALE_PREFIX[this.language] || '/'),
      inLanguage: this.language
    }];
    if (isHome) {
      graph.push({
        '@type': 'Dataset',
        name: SITE_NAME,
        description: DATASET_DESCRIPTION,
        url: urlFor(this.language),
        inLanguage: this.language,
        isAccessibleForFree: true,
        license: 'https://creativecommons.org/licenses/by/4.0/',
        spatialCoverage: { '@type': 'Place', name: 'World' },
        variableMeasured: ['EUR per 100 g', 'Minutes of work per 100 g', 'Currency over/undervaluation vs EUR (%)'],
        creator: { '@type': 'Person', name: 'Nicolò Balini (Human Safari)' }
      });
    }
    let script = document.head.querySelector<HTMLScriptElement>('script[type="application/ld+json"]');
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    // Only static constants go in here; escaping "<" keeps the JSON from closing the script element.
    script.textContent = JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c');
  }

  private setLink(document: Document, rel: string, hreflang: string | undefined, href: string | null) {
    const selector = hreflang ? `link[rel="${rel}"][hreflang="${hreflang}"]` : `link[rel="${rel}"]`;
    let link = document.head.querySelector<HTMLLinkElement>(selector);
    if (!href) {
      link?.remove();
      return;
    }
    if (!link) {
      link = document.createElement('link');
      link.rel = rel;
      if (hreflang) link.hreflang = hreflang;
      document.head.appendChild(link);
    }
    link.href = href;
  }

  acceptCookies() {
    localStorage.setItem('cookie_consent', 'accepted');
    this.cookieBannerVisible.set(false);
  }

  declineCookies() {
    localStorage.setItem('cookie_consent', 'declined');
    this.cookieBannerVisible.set(false);
  }
}
