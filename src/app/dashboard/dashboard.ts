import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Chart, registerables } from 'chart.js';
import adminData from '../admin-data.json';
import itaToEng from '../ita-to-eng.json';

Chart.register(...registerables);

const ITALY_PRICE_100G = 1.00;

interface AdminEntry {
  country: string;
  area: string;
  euro_per_100g: number;
  exchange_rate: number;
  minutes_per_100g: number;
}

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
  regions = ['Tutte le Aree', 'Europe', 'Americas', 'Asia', 'Oceania', 'Africa'];

  allData: (AdminEntry & { valuation_pct: number })[] = [];
  filteredData: (AdminEntry & { valuation_pct: number })[] = [];

  ngOnInit() {
    const engToIta: Record<string, string> = {};
    for (const [ita, eng] of Object.entries(itaToEng)) {
      engToIta[eng as string] = ita;
    }

    this.allData = (adminData as AdminEntry[])
      .filter(d => d.country !== 'Italy' && d.country !== 'Italia')
      .map(d => {
        const italianName = engToIta[d.country] || d.country;
        return {
          ...d,
          country: italianName,
          // PPP rate = euro_per_100g / italy_price_100g = euro_per_100g / 1.00
          // valuation = (ppp_rate - exchange_rate) / exchange_rate * 100
          valuation_pct: ((d.euro_per_100g - d.exchange_rate) / d.exchange_rate) * 100
        };
      });
    this.applyFilter();
  }

  ngAfterViewInit() {
    this.buildCharts();
  }

  applyFilter() {
    this.filteredData = this.selectedRegion === 'Tutte le Aree'
      ? [...this.allData]
      : this.allData.filter(d => d.area === this.selectedRegion);

    if (this.pppChartRef) this.buildCharts();
  }

  buildCharts() {
    this.buildPppChart();
    this.buildFaticaChart();
  }

  buildPppChart() {
    if (!this.pppChartRef) return;
    if (this.pppChart) this.pppChart.destroy();

    // Sort by valuation descending
    const sorted = [...this.filteredData].sort((a, b) => b.valuation_pct - a.valuation_pct);
    const labels = sorted.map(d => d.country);
    const values = sorted.map(d => parseFloat(d.valuation_pct.toFixed(1)));
    const colors = values.map(v => v > 5 ? 'rgba(239,68,68,0.8)' : v < -5 ? 'rgba(34,197,94,0.8)' : 'rgba(156,163,175,0.8)');

    this.pppChart = new Chart(this.pppChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Sopra/Sottovalutazione (%)',
          data: values,
          backgroundColor: colors,
          borderRadius: 5,
          borderWidth: 0
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => {
                const v = ctx.parsed.x ?? 0;
                return v > 0 ? `Sopravvalutata del ${v.toFixed(1)}%` : `Sottovalutata del ${Math.abs(v).toFixed(1)}%`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => v + '%' }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }

  buildFaticaChart() {
    if (!this.faticaChartRef) return;
    if (this.faticaChart) this.faticaChart.destroy();

    // Sort by minutes ascending (easiest first)
    const sorted = [...this.filteredData].sort((a, b) => a.minutes_per_100g - b.minutes_per_100g);
    // Add Italy as reference
    const italyEntry = { country: 'Italia 🇮🇹', minutes_per_100g: 2.41 };
    const allWithItaly = [italyEntry, ...sorted].sort((a, b) => a.minutes_per_100g - b.minutes_per_100g);

    const labels = allWithItaly.map(d => d.country);
    const values = allWithItaly.map(d => d.minutes_per_100g);
    const colors = allWithItaly.map(d =>
      d.country.includes('Italia') ? 'rgba(59,130,246,0.9)' :
      d.minutes_per_100g <= 2.41 ? 'rgba(34,197,94,0.8)' : 'rgba(249,115,22,0.8)'
    );

    this.faticaChart = new Chart(this.faticaChartRef.nativeElement, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Minuti di lavoro per 100g',
          data: values,
          backgroundColor: colors,
          borderRadius: 5,
          borderWidth: 0
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => `${(ctx.parsed.x ?? 0).toFixed(2)} minuti`
            }
          }
        },
        scales: {
          x: {
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: { callback: v => v + ' min' }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }
}
