import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { LicenseService } from 'src/app/services/license/license.service';
import { LogbookService } from 'src/app/services/logbook/logbook.service';
import { MedicalsService } from 'src/app/services/medicals/medicals.service';
import { UserService } from 'src/app/services/user/user.service';
import { CurrencyService } from 'src/app/services/currency/currency.service';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardComponent implements OnInit {

  profileSummary: any = {};

  medicalStatus: any[] = [];
  licenseAlerts: any[] = [];
  logbookSummary: any[] = [];

  // Currency Status
  currencyStatus: any = null;
  hoursBreakdown: any = null;

  // 🔹 Derived dashboard metrics
  flightReady = false;
  totalHours = 0;
  totalFlights = 0;
  lastFlightDate: Date | null = null;

  loading = true;

  // Cached AI briefing — recomputed only when data loads
  todayChecklist: { priority: 'urgent' | 'soon' | 'info'; icon: string; action: string; detail: string }[] = [];
  aiGreeting = '';

  constructor(
    private userService: UserService,
    private medicalService: MedicalsService,
    private logbookService: LogbookService,
    private licenseService: LicenseService,
    private currencyService: CurrencyService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard() {
    this.loading = true;

    // 1️⃣ Profile
    this.userService.getProfile().subscribe({
      next: (res) => { this.profileSummary = res || {}; this.cdr.markForCheck(); },
      error: (err) => console.error(err)
    });

    // 2️⃣ Medicals
    this.medicalService.getAll().subscribe({
      next: (res: any) => {
        const medData = Array.isArray(res) ? res : (res.medicals || []);
        this.medicalStatus = this.formatMedicalStatus(medData);
        this.evaluateFlightReadiness();
        this.computeAiInsights();
        this.cdr.markForCheck();
      }
    });

    // 3️⃣ Logbook
    this.logbookService.getAll().subscribe({
      next: (res: any) => {
        const logData = Array.isArray(res)
          ? res
          : (res.entries || res.logbook || []);

        this.logbookSummary = logData.slice(-5).reverse();
        this.calculateLogbookStats(logData);
        this.computeAiInsights();
        this.cdr.markForCheck();
      }
    });

    // 4️⃣ Licenses
    this.licenseService.getAll().subscribe({
      next: (res: any) => {
        const licData = Array.isArray(res) ? res : (res.licenses || []);
        this.licenseAlerts = this.formatLicenses(licData);
        this.evaluateFlightReadiness();
        this.computeAiInsights();
        this.cdr.markForCheck();
      }
    });

    // 5️⃣ Currency Status (NEW!)
    this.currencyService.getCurrencyStatus().subscribe({
      next: (res: any) => {
        this.currencyStatus = res;
        this.flightReady = res.isFlightReady || false;
        this.computeAiInsights();
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Currency error:', err)
    });

    // 6️⃣ Flight Hours Breakdown (NEW!)
    this.currencyService.getFlightHoursBreakdown().subscribe({
      next: (res: any) => {
        this.hoursBreakdown = res;
        this.totalHours = res.totalTime || 0;
        this.totalFlights = res.totalFlights || 0;
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Hours breakdown error:', err)
    });

    this.loading = false;
  }

  /* ===========================
     🧠 BUSINESS LOGIC
     =========================== */

  private calculateLogbookStats(logs: any[]) {
    this.totalFlights = logs.length;

    this.totalHours = logs.reduce(
      (sum, log) => sum + Number(log.hours || 0),
      0
    );

    if (logs.length) {
      const latest = logs
        .map(l => new Date(l.date))
        .sort((a, b) => b.getTime() - a.getTime())[0];

      this.lastFlightDate = latest;
    }
  }

  private evaluateFlightReadiness() {
    const hasInvalidMedical = this.medicalStatus.some(
      m => m.status !== 'Valid'
    );

    const hasInvalidLicense = this.licenseAlerts.some(
      l => l.status !== 'Valid'
    );

    this.flightReady = !hasInvalidMedical && !hasInvalidLicense;
  }

  /* ===========================
     🧾 HELPERS
     =========================== */

  formatMedicalStatus(medicals: any[]) {
    return medicals.map(m => ({
      ...m,
      classLabel: m.classType || m.type || 'Unknown Class',
      status: this.calculateStatus(m.expiryDate)
    }));
  }

  formatLicenses(licenses: any[]) {
    return licenses.map(l => ({
      ...l,
      license: l.type,
      status: this.calculateStatus(l.expiryDate)
    }));
  }

  trackById(_: number, item: any): string { return item._id || String(_); }
  trackByAction(_: number, item: any): string { return item.action; }

  calculateStatus(date: string) {
    const today = new Date();
    const expiry = new Date(date);
    const diff =
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);

    if (diff < 0) return 'Expired';
    if (diff < 30) return 'Expiring Soon';
    return 'Valid';
  }

  /* ===========================
     🤖 AI CO-PILOT INTELLIGENCE
     =========================== */

  computeAiInsights(): void {
    const items: { priority: 'urgent' | 'soon' | 'info'; icon: string; action: string; detail: string }[] = [];
    const day = 86400000;
    const now = Date.now();

    // Medical checks
    this.medicalStatus.forEach(m => {
      if (m.status === 'Expired') {
        items.push({ priority: 'urgent', icon: '🩺', action: `Renew ${m.classLabel} Medical`, detail: `Expired on ${new Date(m.expiryDate).toLocaleDateString()}` });
      } else if (m.status === 'Expiring Soon') {
        const days = Math.ceil((new Date(m.expiryDate).getTime() - now) / day);
        items.push({ priority: 'soon', icon: '🩺', action: `Schedule ${m.classLabel} Medical Renewal`, detail: `Expires in ${days} day${days !== 1 ? 's' : ''}` });
      }
    });

    // License checks
    this.licenseAlerts.forEach(l => {
      const name = l.license || l.type || 'License';
      if (l.status === 'Expired') {
        items.push({ priority: 'urgent', icon: '📋', action: `Renew ${name}`, detail: 'Document has expired' });
      } else if (l.status === 'Expiring Soon') {
        const days = Math.ceil((new Date(l.expiryDate).getTime() - now) / day);
        items.push({ priority: 'soon', icon: '📋', action: `Upload renewed ${name}`, detail: `Expires in ${days} day${days !== 1 ? 's' : ''}` });
      }
    });

    // Currency checks
    if (this.currencyStatus) {
      if (this.currencyStatus.nightCurrency?.status === 'EXPIRED') {
        items.push({ priority: 'soon', icon: '🌙', action: 'Log night landings', detail: 'Night currency lapsed — 3 full-stop night landings needed in 90 days' });
      }
      if (this.currencyStatus.passengerCurrency?.status === 'EXPIRED') {
        items.push({ priority: 'soon', icon: '👥', action: 'Restore passenger currency', detail: '3 takeoffs & landings required in the last 90 days' });
      }
      if (this.currencyStatus.instrumentCurrency?.status === 'EXPIRED') {
        items.push({ priority: 'urgent', icon: '🎯', action: 'Log instrument approaches', detail: '6 approaches needed in last 6 months for IFR currency' });
      }
      if (this.currencyStatus.flightReview?.status === 'EXPIRED') {
        items.push({ priority: 'urgent', icon: '📅', action: 'Schedule Biennial Flight Review', detail: 'BFR overdue — required every 24 calendar months' });
      } else if (this.currencyStatus.flightReview?.daysRemaining > 0 && this.currencyStatus.flightReview?.daysRemaining <= 60) {
        items.push({ priority: 'soon', icon: '📅', action: 'Schedule Biennial Flight Review', detail: `Due in ${this.currencyStatus.flightReview.daysRemaining} days` });
      }
    }

    // Last flight activity
    if (this.lastFlightDate) {
      const daysSince = Math.floor((now - new Date(this.lastFlightDate).getTime()) / day);
      if (daysSince > 45) {
        items.push({ priority: 'info', icon: '✈️', action: 'Schedule a flight', detail: `No flight logged in ${daysSince} days — review currency requirements` });
      }
    } else if (!this.loading) {
      items.push({ priority: 'info', icon: '✈️', action: 'Log your first flight', detail: 'Start building your pilot logbook' });
    }

    if (items.length === 0 && !this.loading) {
      items.push({ priority: 'info', icon: '✅', action: 'All clear — you are flight ready!', detail: 'No urgent actions. Consider logging your next flight.' });
    }

    // Sort: urgent → soon → info
    const order: Record<string, number> = { urgent: 0, soon: 1, info: 2 };
    this.todayChecklist = items.sort((a, b) => order[a.priority] - order[b.priority]);

    // Compute greeting from cached checklist
    const h = new Date().getHours();
    const name = (this.profileSummary?.name || 'Pilot').split(' ')[0];
    const tod = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
    const urgentCount = this.todayChecklist.filter(i => i.priority === 'urgent').length;
    if (urgentCount > 0) {
      this.aiGreeting = `${tod}, ${name}. You have ${urgentCount} urgent action${urgentCount > 1 ? 's' : ''} requiring attention before your next flight.`;
      return;
    }
    const soonCount = this.todayChecklist.filter(i => i.priority === 'soon').length;
    if (soonCount > 0) {
      this.aiGreeting = `${tod}, ${name}. Everything looks mostly good — ${soonCount} item${soonCount > 1 ? 's' : ''} coming due soon.`;
      return;
    }
    this.aiGreeting = `${tod}, ${name}. Your pilot profile is fully compliant. Clear skies ahead! ✈️`;
  }
}
