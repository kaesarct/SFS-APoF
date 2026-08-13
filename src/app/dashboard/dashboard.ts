import { Component, OnInit, ElementRef, ViewChild, AfterViewInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxEchartsDirective } from 'ngx-echarts';
import { Chart, registerables } from 'chart.js';
import { DataService } from '../data.service';
import { resolveCountryMapName } from '../shared/world-map-names';
import { unwrapAntimeridian } from '../shared/world-map-geo';
import countryIso from '../country-iso.json';
import itaToEng from '../ita-to-eng.json';

Chart.register(...registerables);

const HUMAN_SAFARI_COLOR = '#f59e0b';
const SYSTEM_COLOR = '#3b82f6';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxEchartsDirective],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit, AfterViewInit {

  @ViewChild('pppChart') pppChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('faticaChart') faticaChartRef!: ElementRef<HTMLCanvasElement>;

  pppChart: Chart | null = null;
  faticaChart: Chart | null = null;
  mapChartOption: any = null;
  private mapChart: any = null;
  private worldMapRegistered = false;
  private worldMapNames = new Set<string>();

  selectedRegion = 'Tutte le Aree';
  regions = ['Tutte le Aree'];

  allData: any[] = [];
  filteredData: any[] = [];
  recentUploads: any[] = [];
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
        .map(r => {
          const namesToTry = [
            (r.paese_en || '').toLowerCase(),
            (r.paese_it || '').toLowerCase(),
            ((itaToEng as any)[r.paese_it] || '').toLowerCase(),
            ((itaToEng as any)[r.paese_en] || '').toLowerCase()
          ].filter(n => n.length > 2);

          let flagIso = 'un'; // Default to UN flag for unknown
          
          // 1. Exact match
          for (const name of namesToTry) {
            if ((countryIso as any)[name]) { flagIso = (countryIso as any)[name]; break; }
          }
          
          // 2. Fuzzy match if still UN
          if (flagIso === 'un') {
            for (const name of namesToTry) {
              for (const [key, f] of Object.entries(countryIso)) {
                if (name.includes(key) || key.includes(name)) { flagIso = f as string; break; }
              }
              if (flagIso !== 'un') break;
            }
          }
          
          return {
            ...r,
            country: r.paese_it || r.paese_en,
            isoCode: flagIso,
            valuation_pct: r.euro_per_100g > 0
              ? ((r.euro_per_100g / 1.00) - 1) * 100
              : 0
          };
        });

      // Calcola le rilevazioni più recenti con foto (limitato a 6)
      this.recentUploads = [...this.allData]
        .filter(r => r.photo_url)
        .sort((a, b) => b.data_video.localeCompare(a.data_video))
        .slice(0, 6);

      // Build region list dynamically
      const areas = [...new Set(this.allData.map(d => d.area).filter(Boolean))].sort();
      this.regions = ['Tutte le Aree', ...areas];

      this.applyFilter();
      this.buildWorldMap();
    } catch (e) {
      console.error('Dashboard loadData error', e);
    } finally {
      this.loading = false;
      this.cd.detectChanges();
      setTimeout(() => this.buildCharts(), 0);
    }
  }

  async buildWorldMap() {
    try {
      if (!this.worldMapRegistered) {
        const [{ default: echarts }, topojsonClient, worldTopo] = await Promise.all([
          import('../echarts-setup'),
          import('topojson-client'),
          import('world-atlas/countries-50m.json')
        ]);
        const topology = worldTopo.default as any;
        const geo = unwrapAntimeridian(topojsonClient.feature(topology, topology.objects.countries) as any);
        echarts.registerMap('world', geo as any);
        this.worldMapNames = new Set(geo.features.map((f: any) => f.properties.name));
        this.worldMapRegistered = true;
      }

      const mapData = this.allData.map(d => {
        const isHumanSafari = d.is_human_safari === true || d.nome_utente?.toLowerCase() === 'human safari';
        return {
          name: resolveCountryMapName(d.paese_en, d.paese_it, this.worldMapNames),
          value: d.minutes_per_100g,
          country: d.country,
          euro: d.euro_per_100g,
          minutes: d.minutes_per_100g,
          itemStyle: { areaColor: isHumanSafari ? HUMAN_SAFARI_COLOR : SYSTEM_COLOR }
        };
      });

      this.mapChartOption = {
        tooltip: {
          trigger: 'item',
          formatter: (params: any) => {
            if (!params.data) return '';
            return `<strong>${params.data.country}</strong><br/>${params.data.euro.toFixed(2)} €/100g<br/>${params.data.minutes.toFixed(2)} min/100g`;
          }
        },
        series: [{
          type: 'map',
          map: 'world',
          roam: true,
          scaleLimit: { min: 1, max: 25 },
          selectedMode: false,
          label: { show: false },
          itemStyle: { areaColor: '#ffffff', borderColor: '#d1d5db', borderWidth: 0.5 },
          emphasis: { itemStyle: { areaColor: '#e5e7eb' } },
          data: mapData
        }]
      };
      this.cd.detectChanges();
    } catch (e) {
      console.error('Dashboard buildWorldMap error', e);
    }
  }

  onMapChartInit(chart: any) {
    this.mapChart = chart;
  }

  zoomMap(factor: number) {
    if (!this.mapChart) return;
    // originX/originY (il punto attorno a cui centrare lo zoom, in pixel) sono richiesti da
    // ECharts per questa azione: senza di essi il calcolo della posizione produce NaN.
    const originX = this.mapChart.getWidth() / 2;
    const originY = this.mapChart.getHeight() / 2;
    this.mapChart.dispatchAction({ type: 'geoRoam', zoom: factor, seriesIndex: 0, originX, originY });
  }

  resetMapZoom() {
    if (this.mapChart && this.mapChartOption) {
      this.mapChart.setOption(this.mapChartOption, true);
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

    const italyEntry = { country: 'Italia 🇮🇹', minutes_per_100g: 4.02 };
    const validData = this.filteredData.filter(d => typeof d.minutes_per_100g === 'number' && !isNaN(d.minutes_per_100g));
    const sorted = [...validData].sort((a, b) => a.minutes_per_100g - b.minutes_per_100g);
    const all = [italyEntry, ...sorted].sort((a, b) => a.minutes_per_100g - b.minutes_per_100g);

    const labels = all.map(d => d.country);
    const values = all.map(d => d.minutes_per_100g);
    const colors = all.map(d =>
      d.country.includes('Italia') ? 'rgba(59,130,246,0.9)' :
      d.minutes_per_100g <= 4.02 ? 'rgba(34,197,94,0.8)' : 'rgba(249,115,22,0.8)'
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

  exportCSV() {
    if (!this.filteredData || this.filteredData.length === 0) return;

    const headers = ['Paese', 'Area', 'Prezzo Euro', 'Peso (g)', 'Euro/100g', 'Min/100g', 'Fonte', 'Valutazione (%)'];
    const rows = this.filteredData.map(d => [
      `"${d.country}"`,
      `"${d.area}"`,
      d.prezzo_euro,
      d.peso_grammi,
      d.euro_per_100g.toFixed(2),
      d.minutes_per_100g.toFixed(2),
      `"${d.nome_utente || (d.is_human_safari ? 'Human Safari' : 'Luiggio')}"`,
      d.valuation_pct.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Add BOM for Excel UTF-8 compatibility
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Nutella_Index_${this.selectedRegion.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}
