import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import nutellaData from '../nutella-data.json';
import { DataService } from '../data.service';

const ITALY_PRICE_100G = 1.00;

@Component({
  selector: 'app-ppp-index',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ppp-index.html',
  styleUrls: []
})
export class PppIndex implements OnInit {
  private dataService = inject(DataService);

  countries: string[] = [];
  private currencyMap = new Map<string, { currency: string; rate: number }>();
  private itaToEngMap = new Map<string, string>();

  selectedCountry: string = '';
  localPrice: number | null = null;
  weightGrams: number = 350;

  currencyLabel: string = '';
  exchangeRate: number | null = null;

  pppRate: number | null = null;
  valuationPercentage: number | null = null;
  absValuationPercentage: number | null = null;
  localPriceInEur100g: number | null = null;
  isOvervalued: boolean = false;
  hasCalculated: boolean = false;

  async ngOnInit() {
    try {
      const remote = await this.dataService.getPaesiConfig();
      if (remote.length > 0) {
        this.countries = remote.map((c: any) => c.paese_it).sort((a: string, b: string) => a.localeCompare(b, 'it'));
        remote.forEach((c: any) => {
          this.currencyMap.set(c.paese_it, { currency: c.currency, rate: c.exchange_rate });
          this.itaToEngMap.set(c.paese_it, c.paese_en);
        });
        console.log('ppp-index: loaded', remote.length, 'countries from Firestore');
        return;
      }
      console.warn('ppp-index: Firestore paesi_config empty, using fallback');
    } catch (e) {
      console.error('ppp-index: Firestore error, using fallback', e);
    }
    const [paesiItaFallback, currencyDataFallback, itaToEngFallback] = await Promise.all([
      import('../paesi-ita.json'),
      import('../currency-data.json'),
      import('../ita-to-eng.json')
    ]);
    this.countries = paesiItaFallback.default as string[];
    Object.entries(currencyDataFallback.default as any).forEach(([k, v]: any) => this.currencyMap.set(k, { currency: v.currency, rate: v.rate }));
    Object.entries(itaToEngFallback.default as any).forEach(([k, v]: any) => this.itaToEngMap.set(k, v as string));
  }

  onCountryChange() {
    const data = this.currencyMap.get(this.selectedCountry);
    if (data) {
      this.currencyLabel = data.currency;
      this.exchangeRate = data.rate;
    } else {
      this.currencyLabel = '';
      this.exchangeRate = null;
    }
    this.hasCalculated = false;
    this.pppRate = null;
  }

  getRecentGdp(itaName: string): number {
    const engName = this.itaToEngMap.get(itaName) || itaName;
    const rawGdpData = (nutellaData.gdp as any)[engName];
    if (!rawGdpData) return 0;
    const yearsToTry = ['2026', '2025', '2024', '2023', '2022', '2021', '2020'];
    const keys = Object.keys(rawGdpData);
    for (const year of yearsToTry) {
      const matchingKey = keys.find(k => k.startsWith(year));
      if (matchingKey) {
        const val = rawGdpData[matchingKey];
        if (val !== 'no data' && !isNaN(parseFloat(val))) return parseFloat(val);
      }
    }
    return 0;
  }

  calculate() {
    if (!this.selectedCountry || !this.localPrice || !this.weightGrams || !this.exchangeRate) {
      this.hasCalculated = false;
      return;
    }

    // Normalize to 100g
    const localPrice100g = (this.localPrice / this.weightGrams) * 100;
    const italyPrice100g = ITALY_PRICE_100G;

    // PPP rate: local currency per EUR implied by Nutella prices
    this.pppRate = localPrice100g / italyPrice100g;

    // Valuation: (PPP - exchangeRate) / exchangeRate * 100
    this.valuationPercentage = ((this.pppRate - this.exchangeRate) / this.exchangeRate) * 100;
    this.absValuationPercentage = Math.abs(this.valuationPercentage);
    this.localPriceInEur100g = localPrice100g / this.exchangeRate;
    this.isOvervalued = this.valuationPercentage > 0;

    this.hasCalculated = true;
  }

  get italyPrice(): number { return ITALY_PRICE_100G; }
}
