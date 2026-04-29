import { Component, ChangeDetectionStrategy, ChangeDetectorRef, OnDestroy, OnInit } from '@angular/core';
import { LogEntry, LogbookService } from 'src/app/services/logbook/logbook.service';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
Chart.register(...registerables);


@Component({
  selector: 'app-logbook',
  templateUrl: './logbook.component.html',
  styleUrls: ['./logbook.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LogbookComponent implements OnInit {

  logbook: LogEntry[] = [];
  totalHours = 0;
  totalFlights = 0;
  lastFlightDate: string | null = null;
  showForm = false;
  chart!: Chart;
  flightTypeChart!: Chart;
  liveMode = true;
  refreshIntervalSeconds = 60;
  lastSyncedAt: Date | null = null;
  isRefreshing = false;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private lastChartSignature = '';

  // Cached computed properties — updated only when data loads
  averageHoursPerFlight = 0;
  topAircraft = 'N/A';
  logbookInsights: { type: 'warning' | 'info' | 'success'; icon: string; title: string; detail: string }[] = [];

  aircraftSummary: {
    aircraft: string;
    flights: number;
    hours: number;
  }[] = [];
  

  entry: LogEntry = {
    date: '',
    aircraft: '',
    totalTime: 0,
    pilotInCommand: 0,
    secondInCommand: 0,
    nightTime: 0,
    crossCountry: 0,
    soloTime: 0,
    dualReceived: 0,
    dualGiven: 0,
    instrumentActual: 0,
    instrumentSimulated: 0,
    dayLandings: 0,
    nightLandings: 0,
    departureAirport: '',
    arrivalAirport: '',
    flightType: 'personal',
    instructorName: '',
    remarks: ''
  };

  editingId: string | null = null;
  message = '';

  constructor(private logbookService: LogbookService, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.loadLogbook();
    this.startLiveSync();
  }

  ngOnDestroy() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    if (this.chart) {
      this.chart.destroy();
    }

    if (this.flightTypeChart) {
      this.flightTypeChart.destroy();
    }
  }

  loadLogbook(silent = false) {
    this.isRefreshing = !silent;

    this.logbookService.getAll().subscribe({
      next: (res) => {
        this.logbook = res || [];
        this.refreshDerivedData();
        this.isRefreshing = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.message = 'Error loading logbook!';
        this.isRefreshing = false;
        this.cdr.markForCheck();
      }
    });
  }

  private refreshDerivedData() {
    const nextSignature = this.buildChartSignature(this.logbook);
    const shouldRenderCharts = nextSignature !== this.lastChartSignature;

    this.totalFlights = this.logbook.length;
    this.totalHours = this.logbook.reduce(
      (sum, l) => sum + (Number(l.totalTime || l.hours) || 0),
      0
    );

    this.lastFlightDate = this.logbook.length
      ? this.logbook
          .map(l => l.date)
          .sort()
          .reverse()[0]
      : null;

    this.calculateAircraftSummary();
    this.computeInsights();

    if (shouldRenderCharts) {
      this.renderMonthlyChart();
      this.renderFlightTypeChart();
      this.lastChartSignature = nextSignature;
    }

    this.lastSyncedAt = new Date();
  }

  startLiveSync() {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }

    if (!this.liveMode) {
      return;
    }

    this.refreshTimer = setInterval(() => {
      if (document.hidden) {
        return;
      }
      this.loadLogbook(true);
    }, this.refreshIntervalSeconds * 1000);
  }

  toggleLiveMode() {
    this.liveMode = !this.liveMode;
    this.startLiveSync();
  }

  manualRefresh() {
    this.loadLogbook();
  }

  private buildChartSignature(entries: LogEntry[]): string {
    const head = entries.slice(0, 20).map((entry) => {
      const id = entry._id || '';
      const date = entry.date || '';
      const totalTime = Number(entry.totalTime || entry.hours || 0);
      const type = this.normalizeFlightType(entry.flightType as string);
      return `${id}:${date}:${totalTime}:${type}`;
    }).join('|');

    return `${entries.length}:${head}`;
  }

  
  renderMonthlyChart() {
    if (this.chart) {
      this.chart.destroy();
    }

    const isDarkMode = document.documentElement.classList.contains('dark');
    const legendColor   = isDarkMode ? '#e2e8f0' : '#1e293b';
    const axisTickColor = isDarkMode ? '#94a3b8' : '#475569';
    const axisTitleColor = isDarkMode ? '#cbd5e1' : '#334155';
    const gridColor     = isDarkMode ? 'rgba(148,163,184,0.1)' : 'rgba(100,116,139,0.12)';
    const barColor      = isDarkMode ? 'rgba(56,189,248,0.72)'  : 'rgba(3,105,161,0.68)';
    const barHover      = isDarkMode ? 'rgba(56,189,248,1)'     : 'rgba(3,105,161,1)';

    const monthlyMap: { [key: string]: number } = {};

    this.logbook.forEach(log => {
      const date = new Date(log.date);
      const key  = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyMap[key] = (monthlyMap[key] || 0) + Number(log.totalTime || log.hours || 0);
    });

    const sortedKeys = Object.keys(monthlyMap).sort();

    const labels = sortedKeys.map(k => {
      const [y, m] = k.split('-');
      return new Date(+y, +m - 1).toLocaleString('default', { month: 'short', year: '2-digit' });
    });

    const data = sortedKeys.map(k => parseFloat(monthlyMap[k].toFixed(1)));

    this.chart = new Chart('monthlyHoursChart', {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Flight Hours',
          data,
          backgroundColor: barColor,
          hoverBackgroundColor: barHover,
          borderRadius: 6,
          borderSkipped: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `  ${ctx.raw} hrs`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: axisTickColor },
            grid: { display: false },
            title: {
              display: true,
              text: 'Month',
              color: axisTitleColor,
              font: { size: 11 }
            }
          },
          y: {
            ticks: {
              color: axisTickColor,
              callback: (v) => `${v}h`
            },
            grid: { color: gridColor },
            title: {
              display: true,
              text: 'Flight Hours',
              color: axisTitleColor,
              font: { size: 11 }
            },
            beginAtZero: true
          }
        }
      }
    });
  }

  renderFlightTypeChart() {
    if (this.flightTypeChart) {
      this.flightTypeChart.destroy();
    }

    const isDarkMode  = document.documentElement.classList.contains('dark');
    const legendColor = isDarkMode ? '#e2e8f0' : '#1e293b';
    const borderColor = isDarkMode ? '#0f172a' : '#ffffff';

    const counts: { [key: string]: number } = {};
    this.logbook.forEach(log => {
      const ft = this.normalizeFlightType(log.flightType as string);
      counts[ft] = (counts[ft] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data   = labels.map(l => counts[l]);
    const palette = ['#38bdf8', '#818cf8', '#34d399', '#fb923c', '#f472b6'];

    this.flightTypeChart = new Chart('flightTypeChart', {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: palette.slice(0, labels.length),
          borderWidth: 2,
          borderColor,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: legendColor,
              boxWidth: 12,
              padding: 10,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `  ${ctx.label}: ${ctx.raw} flights`
            }
          }
        }
      }
    });
  }


  calculateAircraftSummary() {
    const map: any = {};
  
    this.logbook.forEach(entry => {
      const key = entry.aircraft?.trim() || 'Unknown';
  
      if (!map[key]) {
        map[key] = {
          aircraft: key,
          flights: 0,
          hours: 0
        };
      }
  
      map[key].flights += 1;
      // Use totalTime if available, fallback to legacy hours field
      map[key].hours += Number(entry.totalTime || entry.hours) || 0;
    });
  
    this.aircraftSummary = Object.values(map);
  }
  
  exportCSV() {
    if (!this.logbook.length) {
      this.message = 'No logbook data to export';
      return;
    }
  
    const headers = ['Date', 'Aircraft', 'Hours', 'Remarks'];
  
    const rows = this.logbook.map(l => [
      l.date,
      l.aircraft,
      l.hours,
      l.remarks || ''
    ]);
  
    const csvContent =
      [headers, ...rows]
        .map(e => e.map(v => `"${v}"`).join(','))
        .join('\n');
  
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement('a');
    link.href = url;
    link.download = `pilot-logbook-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
  
    URL.revokeObjectURL(url);
  }
  

  saveEntry() {
    // Sync legacy hours field with totalTime for backward compatibility
    const normalizedFlightType = this.normalizeFlightType(this.entry.flightType as string);

    const body: LogEntry = {
      ...this.entry,
      flightType: normalizedFlightType,
      hours: this.entry.totalTime
    };

    if (!this.editingId) {
      // CREATE
      this.logbookService.create(body).subscribe({
        next: (created) => {
          this.message = 'Entry added!';
          this.resetForm();

          // Update local view immediately to avoid stale UI if the list is cached.
          this.logbook = [created, ...this.logbook];
          this.refreshDerivedData();
          this.cdr.markForCheck();
        },
        error: () => this.message = 'Error adding entry!'
      });
    } else {
      // UPDATE
      this.logbookService.update(this.editingId, body).subscribe({
        next: (updated) => {
          this.message = 'Entry updated!';
          this.resetForm();

          const idx = this.logbook.findIndex(l => l._id === this.editingId);
          if (idx >= 0) {
            this.logbook[idx] = updated;
            this.refreshDerivedData();
            this.cdr.markForCheck();
          } else {
            // Fallback: reload if the updated entry is not in local cache
            this.loadLogbook();
          }
        },
        error: () => this.message = 'Error updating entry!'
      });
    }
  }

  edit(log: LogEntry) {
    this.entry = { ...log };
    this.entry.flightType = this.normalizeFlightType(log.flightType as string).toLowerCase() as any;
    this.editingId = log._id!;
  }

  delete(id: string) {
    this.logbookService.delete(id).subscribe({
      next: () => this.loadLogbook(),
      error: () => this.message = 'Error deleting entry!'
    });
  }

  resetForm() {
    this.entry = {
      date: '',
      aircraft: '',
      totalTime: 0,
      pilotInCommand: 0,
      secondInCommand: 0,
      nightTime: 0,
      crossCountry: 0,
      soloTime: 0,
      dualReceived: 0,
      dualGiven: 0,
      instrumentActual: 0,
      instrumentSimulated: 0,
      dayLandings: 0,
      nightLandings: 0,
      departureAirport: '',
      arrivalAirport: '',
      flightType: 'personal',
      instructorName: '',
      remarks: ''
    };
    this.editingId = null;
  }

  private computeInsights(): void {
    // averageHoursPerFlight
    this.averageHoursPerFlight = this.totalFlights > 0
      ? Number((this.totalHours / this.totalFlights).toFixed(1))
      : 0;

    // topAircraft
    if (this.aircraftSummary.length > 0) {
      const sorted = [...this.aircraftSummary].sort((a, b) => b.hours - a.hours);
      this.topAircraft = sorted[0].aircraft;
    } else {
      this.topAircraft = 'N/A';
    }

    // logbookInsights
    const _self = this;
    function buildInsights(): { type: 'warning' | 'info' | 'success'; icon: string; title: string; detail: string }[] {
    const insights: { type: 'warning' | 'info' | 'success'; icon: string; title: string; detail: string }[] = [];
    const now = Date.now();
    const day = 86400000;

    // Night currency: 3 night landings in last 90 days
    const nightCutoff = now - 90 * day;
    const recentNightLandings = _self.logbook
      .filter(l => new Date(l.date).getTime() > nightCutoff)
      .reduce((sum, l) => sum + (Number(l.nightLandings) || 0), 0);
    if (recentNightLandings < 3 && _self.totalFlights > 0) {
      insights.push({
        type: 'warning', icon: '🌙',
        title: 'Low Night Currency',
        detail: `${recentNightLandings}/3 night landings in last 90 days. Log more night ops to stay current.`
      });
    }

    // Instrument currency: 6 approaches in last 6 months
    const ifrCutoff = now - 180 * day;
    const recentApproaches = _self.logbook
      .filter(l => new Date(l.date).getTime() > ifrCutoff)
      .reduce((sum, l) => sum + (Number(l.instrumentActual) || 0) + (Number(l.instrumentSimulated) || 0), 0);
    if (recentApproaches < 6) {
      insights.push({
        type: 'warning', icon: '🎯',
        title: 'Instrument Currency Risk',
        detail: `${recentApproaches}/6 instrument approaches in last 6 months. IFR currency requires 6 approaches + holds.`
      });
    }

    // Route diversity
    const routes = _self.logbook
      .filter(l => l.departureAirport && l.arrivalAirport)
      .map(l => `${l.departureAirport?.toUpperCase()}-${l.arrivalAirport?.toUpperCase()}`);
    if (routes.length >= 5) {
      const uniqueRoutes = new Set(routes).size;
      if (uniqueRoutes <= 2) {
        insights.push({
          type: 'info', icon: '🗺️',
          title: 'Low Route Diversity',
          detail: `Only ${uniqueRoutes} unique route${uniqueRoutes > 1 ? 's' : ''} across ${routes.length} logged flights. Cross-country variety builds navigation proficiency.`
        });
      }
    }

    // Dual instruction gap
    const trainingCutoff = now - 90 * day;
    const recentDual = _self.logbook
      .filter(l => new Date(l.date).getTime() > trainingCutoff)
      .reduce((sum, l) => sum + (Number(l.dualReceived) || 0), 0);
    if (_self.totalFlights > 5 && recentDual === 0) {
      insights.push({
        type: 'info', icon: '👨‍🏫',
        title: 'No Recent Dual Instruction',
        detail: 'No dual-received time in the last 90 days. A training session can sharpen skills and support BFR prep.'
      });
    }

    // Extended inactivity
    if (_self.logbook.length > 0) {
      const lastDate = new Date(_self.logbook.map(l => l.date).sort().reverse()[0]);
      const daysSince = Math.floor((now - lastDate.getTime()) / day);
      if (daysSince > 45) {
        insights.push({
          type: 'warning', icon: '⏰',
          title: 'Extended Inactivity',
          detail: `${daysSince} days since last logged flight. Currency requirements may be at risk.`
        });
      }
    }

    // Positive trend detection
    if (_self.logbook.length >= 6) {
      const sorted = [..._self.logbook].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const half = Math.floor(sorted.length / 2);
      const recentHrs = sorted.slice(0, half).reduce((s, l) => s + Number(l.totalTime || l.hours || 0), 0);
      const olderHrs  = sorted.slice(half).reduce((s, l) => s + Number(l.totalTime || l.hours || 0), 0);
      if (olderHrs > 0 && recentHrs > olderHrs * 1.2) {
        insights.push({
          type: 'success', icon: '📈',
          title: 'Flight Hours Trending Up',
          detail: 'Your recent flying rate is 20%+ above your earlier average. Keep it up!'
        });
      }
    }

    if (insights.length === 0 && _self.totalFlights > 0) {
      insights.push({
        type: 'success', icon: '✅',
        title: 'All Currencies Look Good',
        detail: 'No critical gaps detected. Night, instrument, and route activity are on track.'
      });
    }

    return insights;
    }
    this.logbookInsights = buildInsights();
  }

  trackByLogId(_: number, l: LogEntry): string { return l._id || String(_); }
  trackByAircraft(_: number, a: any): string { return a.aircraft; }
  trackByTitle(_: number, i: any): string { return i.title; }

  private normalizeFlightType(type?: string): 'Training' | 'Solo' | 'Personal' | 'Commercial' | 'Other' {
    const normalized = (type || '').toLowerCase();

    if (normalized === 'training') return 'Training';
    if (normalized === 'solo') return 'Solo';
    if (normalized === 'commercial') return 'Commercial';
    if (normalized === 'checkride' || normalized === 'other') return 'Other';
    return 'Personal';
  }
}
