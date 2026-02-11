import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DataService, IndexData } from '../data.service';
import { Chart, registerables } from 'chart.js';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit {
  private dataService = inject(DataService);
  private cdr = inject(ChangeDetectorRef);

  data: IndexData | null = null;
  loading = true;
  error = '';

  @ViewChild('rankingChart') rankingChart!: ElementRef<HTMLCanvasElement>;
  chart: Chart | null = null;

  async ngOnInit() {
    console.log('[Dashboard] ngOnInit started');
    try {
      this.data = await this.dataService.getRealData();
      console.log('[Dashboard] Data received:', this.data);

      this.loading = false;
      this.cdr.detectChanges(); // Force update
      console.log('[Dashboard] Loading set to false');

      // Small delay to ensure view is ready if needed, 
      // though *ngIf should handle it.
      setTimeout(() => {
        console.log('[Dashboard] Initializing chart...');
        this.initChart();
      }, 0);
    } catch (err: any) {
      console.error('[Dashboard] Error fetching data', err);
      this.error = 'Impossibile caricare i dati: ' + (err.message || err);
      this.loading = false;
      this.cdr.detectChanges();
    }
  }

  ngAfterViewInit() {
    // Chart init is handled in ngOnInit after data load
  }

  initChart() {
    if (!this.data || !this.rankingChart) return;

    if (this.chart) {
      this.chart.destroy();
    }

    const ctx = this.rankingChart.nativeElement.getContext('2d');
    if (!ctx) return;

    // Guard against empty data
    if (!this.data.rankings || this.data.rankings.length === 0) return;

    const countries = this.data.rankings.map(d => d.country);
    const values = this.data.rankings.map(d => d.value);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: countries,
        datasets: [{
          label: 'Valore Indice',
          data: values,
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)', // Blue-500
            'rgba(249, 115, 22, 0.8)', // Orange-500
            'rgba(16, 185, 129, 0.8)', // Emerald-500
            'rgba(236, 72, 153, 0.8)', // Pink-500
            'rgba(139, 92, 246, 0.8)', // Violet-500
          ],
          borderColor: 'rgba(0,0,0,0)',
          borderWidth: 1,
          borderRadius: 6,
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: { display: false },
          title: { display: true, text: 'Classifiche Nazionali Attuali' }
        },
        scales: {
          y: { beginAtZero: false, min: 60 }
        }
      }
    });
  }
}
