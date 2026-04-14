import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import nutellaData from '../nutella-data.json';
import { ITALY_WAGE_PER_MINUTE, ITALY_MINUTES_PER_100G, findMatchingTier, PriceTier } from '../shared/tiers';
import { DataService } from '../data.service';

@Component({
  selector: 'app-instant-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './instant-calculator.html',
  styleUrl: './instant-calculator.css'
})
export class InstantCalculator implements OnInit {
  private dataService = inject(DataService);

  countries: string[] = [];
  private currencyMap = new Map<string, { currency: string; rate: number }>();
  private itaToEngMap = new Map<string, string>();
  
  // Form Bindings
  selectedCountry: string = '';
  localPrice: number | null = null;
  private _weightGrams: number = 350;
  get weightGrams(): number { return this._weightGrams; }
  set weightGrams(val: number) { this._weightGrams = val; if (this.hasCalculated) this.calculate(); }
  
  currencyLabel: string = '';
  exchangeRate: number | null = null;

  // Calculated Results
  calculatedEuroPrice: number = 0;
  calculatedMinutes100g: number = 0;
  calculatedMinutesVasetto: number = 0;
  calculatedEquivalentEuro: number = 0;
  calculatedNutellaGrams: number = 0;
  calculatedEuroValue: number = 0;
  matchedTier: PriceTier | null = null;
  
  hasCalculated: boolean = false;
  
  activeTab: 'calcolo' | 'equivalenza' = 'calcolo';
  inputMinutes: number | null = null;

  constructor(private decimalPipe: DecimalPipe) {}

  private cd = inject(ChangeDetectorRef);

  async ngOnInit() {
    try {
      const remote = await this.dataService.getPaesiConfig();
      if (remote.length > 0) {
        this.countries = remote.map((c: any) => c.paese_it).sort((a: string, b: string) => a.localeCompare(b, 'it'));
        remote.forEach((c: any) => {
          this.currencyMap.set(c.paese_it, { currency: c.currency, rate: c.exchange_rate });
          this.itaToEngMap.set(c.paese_it, c.paese_en);
        });
        console.log('instant-calculator: loaded', remote.length, 'countries from Firestore');
        this.cd.detectChanges();
        return;
      }
      console.warn('instant-calculator: Firestore paesi_config empty, using fallback');
    } catch (e) {
      console.error('instant-calculator: Firestore error, using fallback', e);
    }
    const [paesiIta, itaToEng, currencyData] = await Promise.all([
      import('../paesi-ita.json'),
      import('../ita-to-eng.json'),
      import('../currency-data.json')
    ]);
    this.countries = (paesiIta.default as string[]).sort();
    Object.entries(itaToEng.default as any).forEach(([k, v]: any) => this.itaToEngMap.set(k, v as string));
    Object.entries(currencyData.default as any).forEach(([k, v]: any) => this.currencyMap.set(k, { currency: v.currency, rate: v.rate }));
    this.cd.detectChanges();
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
  }

  getRecentGdp(itaName: string): number {
    const engName = this.itaToEngMap.get(itaName) || itaName;
    const rawGdpData = (nutellaData.gdp as any)[engName];
    if (!rawGdpData) return 0;
    const yearsToTry = ["2026", "2025", "2024", "2023", "2022", "2021", "2020"];
    const keys = Object.keys(rawGdpData);
    for (const year of yearsToTry) {
       const matchingKey = keys.find(k => k.startsWith(year));
       if (matchingKey) {
          const val = rawGdpData[matchingKey];
          if (val !== "no data" && !isNaN(parseFloat(val))) return parseFloat(val);
       }
    }
    return 0;
  }

  calculate() {
    if (!this.selectedCountry || !this.localPrice || !this.weightGrams || !this.exchangeRate) {
      this.hasCalculated = false;
      return;
    }

    const gdpPerCapita = this.getRecentGdp(this.selectedCountry);
    if (gdpPerCapita <= 0) {
      alert(`Nessun dato PIL trovato per ${this.selectedCountry}`);
      return;
    }

    // "Quindi il programma si converte automaticamente il costo in valuta locale in quello in EURO dividendo la variabile inserita per il TASSO DI CONVERSIONE"
    this.calculatedEuroPrice = this.localPrice / this.exchangeRate;

    // "Con il PIL fa lo stesso conto del Nutella index normale" (Prezzo_Euro_100g / PIL) * 2000 * 60
    const prezzoEuro100g = (this.calculatedEuroPrice / this.weightGrams) * 100;
    this.calculatedMinutes100g = (prezzoEuro100g / gdpPerCapita) * 2000 * 60;

    // "In questa istanza [...] l'utente ha caricato il prezzo di un vasetto da 350g e vuole sapere quanto tempo ci vuole per acquistare quello."
    // 350/100 * min(100)
    this.calculatedMinutesVasetto = (this.weightGrams / 100) * this.calculatedMinutes100g;

    // "Prende i minuti per il vasetto, li moltiplica per 0.31 (ITALY_WAGE_PER_MINUTE) e trova la fascia di prezzo"
    this.calculatedEquivalentEuro = this.calculatedMinutesVasetto * ITALY_WAGE_PER_MINUTE;
    this.matchedTier = findMatchingTier(this.calculatedEquivalentEuro);
    this.calculatedNutellaGrams = (this.calculatedMinutesVasetto / ITALY_MINUTES_PER_100G) * 100;
    
    // Auto-populate the equivalency tab if they switch to it
    this.inputMinutes = this.calculatedMinutesVasetto;
    this.calculatedEuroValue = this.calculatedEquivalentEuro;
    
    this.hasCalculated = true;
  }

  switchTab(tab: 'calcolo' | 'equivalenza') {
    this.activeTab = tab;
    // If switching to equivalenza and we have a calculated result, run calculations.
    if (tab === 'equivalenza' && this.inputMinutes == null && this.calculatedMinutesVasetto > 0) {
      this.inputMinutes = this.calculatedMinutesVasetto;
      this.calculateEquivalency();
    }
  }

  calculateEquivalency() {
    if (!this.inputMinutes) return;
    this.calculatedEuroValue = this.inputMinutes * ITALY_WAGE_PER_MINUTE;
    this.matchedTier = findMatchingTier(this.calculatedEuroValue);
    this.calculatedNutellaGrams = (this.inputMinutes / ITALY_MINUTES_PER_100G) * 100;
  }
}
