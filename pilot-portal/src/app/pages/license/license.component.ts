import { Component, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { License, LicenseService, Endorsement } from 'src/app/services/license/license.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-license',
  templateUrl: './license.component.html',
  styleUrls: ['./license.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class LicenseComponent {

  licenseType!: 'SPL' | 'PPL' | 'CPL' | 'AIPL';

  license?: License;
  loading = true;
  showForm = false;
  showPreview = false;
  showEndorsementForm = false;
  showRatingForm = false;
  message = '';

  selectedFile?: File;
  safePdfUrl?: SafeResourceUrl;
  isSaving = false;

  form: Partial<License> = {};
  endorsementForm: Partial<Endorsement> = {};
  newRating = '';

  availableRatings = [
    'Instrument Rating',
    'Multi-Engine Rating',
    'Seaplane Rating',
    'Glider Rating',
    'Helicopter Rating',
    'Type Rating'
  ];

  availableEndorsements = [
    'High Performance Aircraft',
    'Complex Aircraft',
    'Tailwheel Aircraft',
    'High Altitude',
    'Pressurized Aircraft',
    'Float Plane',
    'Banner Towing'
  ];

  constructor(
    private route: ActivatedRoute,
    private licenseService: LicenseService,
    private sanitizer: DomSanitizer,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const type = params.get('type');

      // map route → backend enum
      this.licenseType = type?.toUpperCase() as any;

      this.loadLicense();
    });
  }

  loadLicense() {
    this.loading = true;

    this.licenseService.getAll().subscribe({
      next: (res) => {
        this.license = res.find(l => l.type === this.licenseType);
        this.loading = false;
        this.cdr.markForCheck();

        if (this.license?.documentUrl) {
          this.safePdfUrl = this.sanitizer.bypassSecurityTrustResourceUrl(
            this.getDocumentUrl(this.license.documentUrl)
          );
        }
      },
      error: () => {
        this.message = 'Error loading license';
        this.loading = false;
        this.cdr.markForCheck();
      }
    });
  }

  get status() {
    if (!this.license?.expiryDate) return 'Unknown';

    const diff =
      (new Date(this.license.expiryDate).getTime() - Date.now()) /
      (1000 * 60 * 60 * 24);

    if (diff < 0) return 'Expired';
    if (diff < 30) return 'Expiring Soon';
    return 'Valid';
  }

  openForm() {
    this.form = {
      licenseNumber: this.license?.licenseNumber || '',
      issueDate: this.license?.issueDate || '',
      expiryDate: this.license?.expiryDate || '',
      remarks: this.license?.remarks || ''
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
  
    formData.append('type', this.licenseType);
    formData.append('licenseNumber', this.form.licenseNumber || '');
    formData.append('issueDate', this.form.issueDate || '');
    formData.append('expiryDate', this.form.expiryDate || '');
    formData.append('restrictions', this.form.restrictions || '');
    formData.append('remarks', this.form.remarks || '');
  
    if (this.selectedFile) {
      formData.append('document', this.selectedFile);
    }
  
    const request = this.license
      ? this.licenseService.update(this.license._id!, formData as any)
      : this.licenseService.create(formData as any);
  
    request.subscribe({
      next: () => {
        this.message = 'License saved successfully';
        this.showForm = false;
        this.isSaving = false;
        this.cdr.markForCheck();
        this.loadLicense();
      },
      error: (err) => {
        this.isSaving = false;
        this.message = err.error?.message || 'Error saving license';
        this.cdr.markForCheck();
      }
    });
  }

  openEndorsementForm() {
    this.endorsementForm = {
      endorsementType: '',
      instructorName: '',
      instructorCertificate: '',
      date: new Date().toISOString().split('T')[0],
      aircraftType: '',
      remarks: ''
    };
    this.showEndorsementForm = true;
  }

  saveEndorsement() {
    if (!this.license?._id || !this.endorsementForm.endorsementType) {
      this.message = 'Please fill in required fields';
      return;
    }

    this.licenseService.addEndorsement(this.license._id, this.endorsementForm).subscribe({
      next: (updatedLicense) => {
        this.license = updatedLicense;
        this.showEndorsementForm = false;
        this.message = 'Endorsement added successfully';
        this.cdr.markForCheck();
        this.loadLicense();
      },
      error: (err) => {
        this.message = err.error?.message || 'Error adding endorsement';
        this.cdr.markForCheck();
      }
    });
  }

  openRatingForm() {
    this.newRating = '';
    this.showRatingForm = true;
  }

  saveRating() {
    if (!this.license?._id || !this.newRating) {
      this.message = 'Please select a rating';
      return;
    }

    this.licenseService.addRating(this.license._id, this.newRating).subscribe({
      next: (updatedLicense) => {
        this.license = updatedLicense;
        this.showRatingForm = false;
        this.message = 'Rating added successfully';
        this.cdr.markForCheck();
        this.loadLicense();
      },
      error: (err) => {
        this.message = err.error?.message || 'Error adding rating';
        this.cdr.markForCheck();
      }
    });
  }

  removeEndorsement(endorsementId: string) {
    if (!this.license?._id || !confirm('Remove this endorsement?')) return;

    this.licenseService.removeEndorsement(this.license._id, endorsementId).subscribe({
      next: () => {
        this.message = 'Endorsement removed';
        this.cdr.markForCheck();
        this.loadLicense();
      },
      error: (err) => {
        this.message = err.error?.message || 'Error removing endorsement';
        this.cdr.markForCheck();
      }
    });
  }

  get daysToExpiry(): number | null {
    if (!this.license?.expiryDate) return null;
    const diffMs = new Date(this.license.expiryDate).getTime() - Date.now();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  }

  get complianceScore(): number {
    if (!this.license) return 0;

    let score = 40;
    if (this.license.documentUrl) score += 20;
    if (this.license.ratings && this.license.ratings.length > 0) score += 20;
    if (this.license.endorsements && this.license.endorsements.length > 0) score += 20;

    return Math.min(score, 100);
  }

  get renewalAction(): string {
    if (this.daysToExpiry === null) return 'Upload license details to activate compliance monitoring.';
    if (this.daysToExpiry < 0) return 'License expired. Stop operations and renew immediately.';
    if (this.daysToExpiry <= 30) return 'High priority renewal window. Submit renewal package now.';
    if (this.daysToExpiry <= 90) return 'Prepare renewal documents and schedule competency checks.';
    return 'License currently healthy. Maintain endorsements and rating validity.';
  }

  get endorsementsCount(): number {
    return this.license?.endorsements?.length || 0;
  }

  get ratingsCount(): number {
    return this.license?.ratings?.length || 0;
  }

  getDocumentUrl(url: string): string {
    if (url.startsWith('http')) return url;
    return `${environment.apiUrl.replace('/api', '')}${url}`;
  }
  
}
