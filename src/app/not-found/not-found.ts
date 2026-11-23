import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [RouterLink],
  template: `
    <div class="max-w-xl mx-auto text-center py-16">
      <h1 class="text-3xl font-bold text-gray-900 mb-4" i18n="@@notFound.title">Pagina non trovata</h1>
      <p class="text-gray-600 mb-8" i18n="@@notFound.text">La pagina che cerchi non esiste o è stata spostata.</p>
      <a routerLink="/" class="px-4 py-2 rounded-lg text-white font-medium" style="background-color: #e50101;" i18n="@@notFound.back">
        Torna alla dashboard
      </a>
    </div>
  `
})
export class NotFound {}
