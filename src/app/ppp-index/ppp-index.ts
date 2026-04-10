import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import paesiIta from '../paesi-ita.json';
import currencyData from '../currency-data.json';
import itaToEng from '../ita-to-eng.json';
import nutellaData from '../nutella-data.json';

const ITALY_PRICE_100G = 1.00;

@Component({
  selector: 'app-ppp-index',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './ppp-index.html',
  styleUrls: []
})
export class PppIndex implements OnInit {
  countries: string[] = [];

  selectedCountry: string = '';
  localPrice: number | null = null;
  weightGrams: number = 350;

  // Auto-filled from currency-data
  currencyLabel: string = '';
  exchangeRate: number | null = null;

  // Results
  pppRate: number | null = null;
  valuationPercentage: number | null = null;
  absValuationPercentage: number | null = null;
  isOvervalued: boolean = false;
  hasCalculated: boolean = false;

  ngOnInit() {
    this.countries = paesiIta as string[];
  }

  onCountryChange() {
    const data = (currencyData as any)[this.selectedCountry];
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

  getRecentGdp(engName: string): number {
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
    this.isOvervalued = this.valuationPercentage > 0;

    this.hasCalculated = true;
  }

  get italyPrice(): number { return ITALY_PRICE_100G; }
}
