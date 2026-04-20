import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DataService } from '../data.service';
import nutellaData from '../nutella-data.json';

@Component({
  selector: 'app-data-submission',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  providers: [DecimalPipe],
  templateUrl: './link-submission.html',
  styleUrl: './link-submission.css'
})
export class DataSubmission implements OnInit {
  private fb = inject(FormBuilder);
  private dataService = inject(DataService);
  private cd = inject(ChangeDetectorRef);

  // Data loaded from Firestore
  countries: string[] = [];
  private currencyMap = new Map<string, { currency: string; code: string; rate: number }>();
  private itaToEngMap = new Map<string, string>();
  private gdpData: any = nutellaData.gdp;

  // Auto-filled fields (not in form, shown as readonly)
  currencyLabel = '';
  currencyCode = '';
  exchangeRate: number | null = null;
  calculatedEuroPrice: number | null = null;

  // Preview result
  nutellaIndexMinutes: number | null = null;
  valoreGdpEur: number | null = null;
  costo100g: number | null = null;

  isSubmitting = false;
  successMessage = '';
  errorMessage = '';

  form = this.fb.group({
    country: ['', Validators.required],
    price: [null as number | null, [Validators.required, Validators.min(0.01)]],
    weight: [null as number | null, [Validators.required, Validators.min(1)]],
    city: ['', Validators.required],
    userName: [''],
    gdprConsent: [false, Validators.requiredTrue]
  });

  async ngOnInit() {
    try {
      const remote = await this.dataService.getPaesiConfig();
      if (remote.length > 0) {
        this.countries = remote.map((c: any) => c.paese_it).sort((a: string, b: string) => a.localeCompare(b, 'it'));
        remote.forEach((c: any) => {
          this.currencyMap.set(c.paese_it, { currency: c.currency, code: c.currency_code, rate: c.exchange_rate });
          this.itaToEngMap.set(c.paese_it, c.paese_en);
        });
        this.cd.detectChanges();
        return;
      }
    } catch (e) {
      console.error('link-submission: Firestore error, using fallback', e);
    }
    // Fallback to local JSON
    const [paesiIta, itaToEng, currencyData] = await Promise.all([
      import('../paesi-ita.json'),
      import('../ita-to-eng.json'),
      import('../currency-data.json')
    ]);
    this.countries = (paesiIta.default as string[]).sort();
    Object.entries(itaToEng.default as any).forEach(([k, v]: any) => this.itaToEngMap.set(k, v as string));
    Object.entries(currencyData.default as any).forEach(([k, v]: any) =>
      this.currencyMap.set(k, { currency: v.currency, code: v.currency_code || '', rate: v.rate })
    );
    this.cd.detectChanges();
  }

  onCountryChange() {
    const country = this.form.value.country;
    if (!country) { this.resetCurrency(); return; }
    const data = this.currencyMap.get(country);
    if (data) {
      this.currencyLabel = data.currency;
      this.currencyCode = data.code;
      this.exchangeRate = data.rate;
    } else {
      this.resetCurrency();
    }
    this.recalculate();
  }

  private resetCurrency() {
    this.currencyLabel = '';
    this.currencyCode = '';
    this.exchangeRate = null;
    this.calculatedEuroPrice = null;
    this.nutellaIndexMinutes = null;
  }

  onPriceOrWeightChange() {
    this.recalculate();
  }

  private recalculate() {
    const v = this.form.value;
    const price = Number(v.price);
    const weight = Number(v.weight);

    if (!price || !this.exchangeRate) {
      this.calculatedEuroPrice = null;
      this.nutellaIndexMinutes = null;
      return;
    }

    // Auto-convert local price to Euro
    this.calculatedEuroPrice = price / this.exchangeRate;

    if (!weight || !v.country) {
      this.nutellaIndexMinutes = null;
      return;
    }

    // Nutella Index preview
    const engCountry = this.itaToEngMap.get(v.country!) || v.country!;
    const gdpObj = this.gdpData[engCountry];
    let gdp = 0;
    if (gdpObj) {
      for (const key of ['2026', '2025', '2024', '2023', '2022', '2021', '2020']) {
        const val = gdpObj[key];
        if (val && val !== 'no data' && !isNaN(parseFloat(val))) { gdp = parseFloat(val); break; }
      }
    }
    if (gdp <= 0) { this.nutellaIndexMinutes = null; this.valoreGdpEur = null; this.costo100g = null; return; }

    this.valoreGdpEur = gdp;
    this.costo100g = (this.calculatedEuroPrice / weight) * 100;
    this.nutellaIndexMinutes = Math.round(((this.costo100g / gdp) * 2000 * 60) * 100) / 100;
  }

  async onSubmit() {
    if (this.form.invalid || !this.exchangeRate) {
      this.errorMessage = 'Compila tutti i campi richiesti e seleziona un paese valido.';
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';
    this.successMessage = '';

    try {
      const v = this.form.value;
      const price = Number(v.price);
      const euroPrice = price / (this.exchangeRate ?? 1);

      await this.dataService.submitData({
        country: v.country,
        city: v.city,
        price: price,
        currency: this.currencyCode || this.currencyLabel,
        euroPrice: euroPrice,
        weight: Number(v.weight),
        exchangeRate: this.exchangeRate,
        nome_utente: v.userName || '',
        nutellaIndexMinutes: this.nutellaIndexMinutes
      });

      this.successMessage = 'Grazie! I tuoi dati sono stati inviati con successo.';
      this.form.reset();
      this.resetCurrency();

    } catch (e) {
      console.error(e);
      this.errorMessage = 'Errore durante l\'invio. Riprova più tardi.';
    } finally {
      this.isSubmitting = false;
    }
  }
}
