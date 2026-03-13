import { Component, Input, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Medical, MedicalsService } from 'src/app/services/medicals/medicals.service';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { environment } from 'src/environments/environment';


@Component({
  selector: 'app-medicals',
  templateUrl: './medicals.component.html',
  styleUrls: ['./medicals.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MedicalsComponent {
  
  classType!: 'Class 1' | 'Class 2' | 'Class 3';

  medical?: Medical;
  loading = true;
  showForm = false;
  message = '';
  selectedFile?: File;
  isSaving = false;

  reminderOptions = [90, 60, 45, 30, 14, 7];
  quickReminderOptions = [45, 30, 14];

  showPreview = false;
  safePdfUrl?: SafeResourceUrl;


  form: Partial<Medical> = {};

  constructor(private route: ActivatedRoute, private medicalService: MedicalsService, private sanitizer: DomSanitizer, private cdr: ChangeDetectorRef) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('classType');

      const classMap: Record<string, 'Class 1' | 'Class 2' | 'Class 3'> = {
        class1: 'Class 1',
        class2: 'Class 2',
        class3: 'Class 3'
      };

      this.classType = classMap[type || ''] || 'Class 1';

      this.loadMedical();
    });
  }

  loadMedical() {
    this.loading = true;

    this.medicalService.getAll().subscribe({
      next: (res) => {
        this.medical = res.find(m => m.classType === this.classType);
        this.safePdfUrl = undefined;
        this.showPreview = false;
        if (this.medical?.documentUrl) {
          this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            `${this.uploadBaseUrl}${this.medical.documentUrl}`
          );
        }
        this.loading = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.message = 'Error loading medical';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get status() {
    if (!this.medical?.expiryDate) return 'Unknown';

    const diff =
      (new Date(this.medical.expiryDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);

    if (diff < 0) return 'Expired';
    if (diff < 30) return 'Expiring Soon';
    return 'Valid';
  }

  openRenew() {
    this.form = {
      issueDate: this.medical?.issueDate || '',
      expiryDate: this.medical?.expiryDate || '',
      examinerName: this.medical?.examinerName || '',
      examinerNumber: this.medical?.examinerNumber || '',
      examinationDate: this.medical?.examinationDate || '',
      restrictions: this.medical?.restrictions || '',
      limitations: this.medical?.limitations || '',
      reminderDays: this.medical?.reminderDays || 30,
      remarks: this.medical?.remarks || ''
    };
    this.message = '';
    this.showForm = true;
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file && file.type === 'application/pdf') {
      this.selectedFile = file;
    } else {
      this.message = 'Only PDF files are allowed';
    }
  }
  
  

  save() {
    this.isSaving = true;
    this.message = '';

    const formData = new FormData();
  
    formData.append('classType', this.classType);
    if (this.form.issueDate)
      formData.append('issueDate', this.form.issueDate);
    if (this.form.expiryDate)
      formData.append('expiryDate', this.form.expiryDate);
    if (this.form.examinerName)
      formData.append('examinerName', this.form.examinerName);
    if (this.form.examinerNumber)
      formData.append('examinerNumber', this.form.examinerNumber);
    if (this.form.examinationDate)
      formData.append('examinationDate', this.form.examinationDate);
    if (this.form.restrictions)
      formData.append('restrictions', this.form.restrictions);
    if (this.form.limitations)
      formData.append('limitations', this.form.limitations);
    if (this.form.reminderDays)
      formData.append('reminderDays', String(this.form.reminderDays));
    if (this.form.remarks)
      formData.append('remarks', this.form.remarks);
  
    if (this.selectedFile) {
      formData.append('document', this.selectedFile);
    }
  
    const request = this.medical
      ? this.medicalService.updateMedical(this.medical._id, formData)
      : this.medicalService.createMedical(formData);
  
    request.subscribe({
      next: () => {
        this.message = 'Medical saved successfully';
        this.showForm = false;
        this.selectedFile = undefined;
        this.isSaving = false;
        this.cdr.markForCheck();
        this.loadMedical();
      },
      error: (err) => {
        this.isSaving = false;
        this.message = err.error?.message || 'Error saving medical';
        this.cdr.markForCheck();
      }
    });
  }

  get uploadBaseUrl(): string {
    return environment.apiUrl.replace('/api', '');
  }

  get daysToExpiry(): number | null {
    if (!this.medical?.expiryDate) return null;
    const diffMs = new Date(this.medical.expiryDate).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  get medicalReadinessScore(): number {
    if (!this.medical) return 0;

    let score = 30;
    if (this.medical.documentUrl) score += 20;
    if (this.medical.issueDate && this.medical.expiryDate) score += 20;
    if (this.medical.examinerName) score += 10;
    if (this.medical.examinationDate) score += 10;
    if (this.medical.reminderDays) score += 10;

    return Math.min(score, 100);
  }

  get renewalAction(): string {
    if (this.daysToExpiry === null) return 'Upload your medical to enable proactive renewal planning.';
    if (this.daysToExpiry < 0) return 'Certificate expired. Renew immediately before next operation.';
    if (this.daysToExpiry <= 14) return 'Critical window. Schedule AME appointment immediately.';
    if (this.daysToExpiry <= 45) return 'Renewal window open. Book your medical review this week.';
    return 'All good. Keep your reminder cadence active.';
  }

  get expiryProgress(): number {
    if (!this.medical?.issueDate || !this.medical?.expiryDate) return 0;
    const issue = new Date(this.medical.issueDate).getTime();
    const expiry = new Date(this.medical.expiryDate).getTime();
    const now = Date.now();

    if (expiry <= issue) return 0;
    const elapsed = Math.max(0, Math.min(now - issue, expiry - issue));
    return Math.round((elapsed / (expiry - issue)) * 100);
  }

  quickSetReminder(days: number): void {
    this.form.reminderDays = days;
  }

  trackByNumber(_: number, value: number): number {
    return value;
  }

  trackByHistory(_: number, prev: any): string {
    return `${prev.classType || ''}-${prev.issueDate || ''}-${prev.expiryDate || ''}`;
  }

  autoFillExpiryFromIssue(): void {
    if (!this.form.issueDate) {
      this.message = 'Select an issue date first.';
      return;
    }

    const issueDate = new Date(this.form.issueDate);
    issueDate.setFullYear(issueDate.getFullYear() + 1);
    this.form.expiryDate = issueDate.toISOString().split('T')[0];
  }
  

}
