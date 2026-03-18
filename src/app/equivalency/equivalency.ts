import { Component } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ITALY_WAGE_PER_MINUTE, ITALY_MINUTES_PER_100G, PriceTier, findMatchingTier } from '../shared/tiers';

@Component({
  selector: 'app-equivalency',
  standalone: true,
  imports: [CommonModule, FormsModule],
  providers: [DecimalPipe],
  templateUrl: './equivalency.html',
  styleUrl: './equivalency.css'
})
export class EquivalencyPage {
  // Form Binding
  inputMinutes: number | null = null;
  selectedCountryObj: any | null = null;

  // Calculated Results
  calculatedEuroValue: number = 0;
  calculatedNutellaGrams: number = 0;
  matchedTier: PriceTier | null = null;

  constructor(private decimalPipe: DecimalPipe) {}

  calculateEquivalency() {
    if (this.inputMinutes === null || this.inputMinutes <= 0) {
      this.clearResults();
      return;
    }

    // Mathematical calculations
    this.calculatedEuroValue = this.inputMinutes * ITALY_WAGE_PER_MINUTE;
    this.calculatedNutellaGrams = (this.inputMinutes / ITALY_MINUTES_PER_100G) * 100;

    // Item matching
    this.matchedTier = findMatchingTier(this.calculatedEuroValue);
  }

  clearResults() {
    this.calculatedEuroValue = 0;
    this.calculatedNutellaGrams = 0;
    this.matchedTier = null;
  }
}
