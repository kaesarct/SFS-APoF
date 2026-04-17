import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import { DataService } from '../data.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit {

  @ViewChild('pppChart') pppChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('faticaChart') faticaChartRef!: ElementRef<HTMLCanvasElement>;

  pppChart: Chart | null = null;
  faticaChart: Chart | null = null;

  selectedRegion = 'Tutte le Aree';
  regions = ['Tutte le Aree'];

  allData: any[] = [];
  filteredData: any[] = [];
  loading = true;

  private dataService = inject(DataService);
  private cd = inject(ChangeDetectorRef);

  ngOnInit() { this.loadData(); }
  ngAfterViewInit() { this.buildCharts(); }

  async loadData() {
    this.loading = true;
    try {
      const rilevazioni = await this.dataService.getRilevazioni();

      // Keep only the latest rilevazione per paese
      const latestMap = new Map<string, any>();
      for (const r of rilevazioni) {
        const existing = latestMap.get(r.paese_en);
        if (!existing || r.data_video > existing.data_video) latestMap.set(r.paese_en, r);
      }

      this.allData = Array.from(latestMap.values())
        .filter(r => r.paese_en?.toLowerCase() !== 'italy' && r.paese_it?.toLowerCase() !== 'italia')
        .map(r => ({
          ...r,
          country: r.paese_it || r.paese_en,
          valuation_pct: r.euro_per_100g > 0
            ? ((r.euro_per_100g / 1.00) - 1) * 100
            : 0
        }));

      // Build region list dynamically
      const areas = [...new Set(this.allData.map(d => d.area).filter(Boolean))].sort();
      this.regions = ['Tutte le Aree', ...areas];

      this.applyFilter();
    } catch (e) {
      console.error('Dashboard loadData error', e);
    } finally {
      this.loading = false;
      this.cd.detectChanges();
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  applyFilter() {
    this.filteredData = this.selectedRegion === 'Tutte le Aree'
      ? [...this.allData]
      : this.allData.filter(d => d.area === this.selectedRegion);
    if (!this.loading) {
      this.cd.detectChanges();
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  buildCharts() {
    this.buildPppChart();
    this.buildFaticaChart();
  }

  buildPppChart() {
    if (!this.pppChartRef) return;
    if (this.pppChart) this.pppChart.destroy();

    const sorted = [...this.filteredData].sort((a, b) => b.valuation_pct - a.valuation_pct);
    const labels = sorted.map(d => d.country);
    const values = sorted.map(d => parseFloat(d.valuation_pct.toFixed(1)));
    const colors = values.map(v => v > 5 ? 'rgba(239,68,68,0.8)' : v < -5 ? 'rgba(34,197,94,0.8)' : 'rgba(156,163,175,0.8)');

    this.pppChart = new Chart(this.pppChartRef.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Sopra/Sottovalutazione (%)', data: values, backgroundColor: colors, borderRadius: 5, borderWidth: 0 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => { const v = ctx.parsed.x ?? 0; return v > 0 ? `Sopravvalutata del ${v.toFixed(1)}%` : `Sottovalutata del ${Math.abs(v).toFixed(1)}%`; } } }
        },
        scales: { x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v + '%' } }, y: { grid: { display: false } } }
      }
    });
  }

  buildFaticaChart() {
    if (!this.faticaChartRef) return;
    if (this.faticaChart) this.faticaChart.destroy();

    const italyEntry = { country: 'Italia 🇮🇹', minutes_per_100g: 1.56 };
    const validData = this.filteredData.filter(d => typeof d.minutes_per_100g === 'number' && !isNaN(d.minutes_per_100g));
    const sorted = [...validData].sort((a, b) => a.minutes_per_100g - b.minutes_per_100g);
    const all = [italyEntry, ...sorted].sort((a, b) => a.minutes_per_100g - b.minutes_per_100g);

    const labels = all.map(d => d.country);
    const values = all.map(d => d.minutes_per_100g);
    const colors = all.map(d =>
      d.country.includes('Italia') ? 'rgba(59,130,246,0.9)' :
      d.minutes_per_100g <= 1.56 ? 'rgba(34,197,94,0.8)' : 'rgba(249,115,22,0.8)'
    );

    this.faticaChart = new Chart(this.faticaChartRef.nativeElement, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Minuti di lavoro per 100g', data: values, backgroundColor: colors, borderRadius: 5, borderWidth: 0 }] },
      options: {
        indexAxis: 'y', responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: ctx => `${(ctx.parsed.x ?? 0).toFixed(2)} minuti` } }
        },
        scales: { x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v + ' min' } }, y: { grid: { display: false } } }
      }
    });
  }
}
