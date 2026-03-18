import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

@Component({
  selector: 'app-ppp-index',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './ppp-index.html',
  styleUrls: []
})
export class PppIndex implements OnInit {
  private fb = inject(FormBuilder);

  form = this.fb.group({
    italyPrice: [5.00, [Validators.required, Validators.min(0.01)]],
    localCurrency: ['GBP', Validators.required],
    localPrice: [null as number | null, [Validators.required, Validators.min(0.01)]],
    exchangeRate: [null as number | null, [Validators.required, Validators.min(0.0001)]]
  });

  pppRate: number | null = null;
  valuationPercentage: number | null = null;
  absValuationPercentage: number | null = null;
  isOvervalued: boolean = false;

  ngOnInit() {
    this.form.valueChanges.subscribe(() => {
      this.calculatePPP();
    });
  }

  calculatePPP() {
    if (this.form.invalid) {
      this.pppRate = null;
      this.valuationPercentage = null;
      return;
    }

    const { italyPrice, localPrice, exchangeRate } = this.form.value;

    if (!italyPrice || !localPrice || !exchangeRate) return;

    // PPP = Local Price / Italy Price
    this.pppRate = localPrice / italyPrice;

    // Valuation = (PPP - Exchange Rate) / Exchange Rate * 100
    // wait, if PPP rate > Exchange Rate -> overvalued
    this.valuationPercentage = ((this.pppRate - exchangeRate) / exchangeRate) * 100;
    this.absValuationPercentage = Math.abs(this.valuationPercentage);
    this.isOvervalued = this.valuationPercentage > 0;
  }
}
