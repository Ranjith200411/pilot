import { Component, OnInit, HostListener, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from 'src/app/services/auth/auth.service';
import { UserService } from 'src/app/services/user/user.service';
import { ThemeService } from 'src/app/services/theme/theme.service';
import { ToastService } from 'src/app/services/toast/toast.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HeaderComponent implements OnInit {

  user: any = {};
  initials = 'U';
  menuOpen = false;
  notificationOpen = false;
  showAllNotifications = false;
  isDarkMode = false;
  
  notifications = [
    { id: 1, title: 'License Renewal', message: 'Your PPL license expires in 30 days', time: '2 hours ago', type: 'warning', read: false },
    { id: 2, title: 'Medical Certificate', message: 'Class 1 medical approved', time: '1 day ago', type: 'success', read: false },
    { id: 3, title: 'Logbook Entry', message: 'New flight recorded successfully', time: '2 days ago', type: 'info', read: true }
  ];

  constructor(
    private auth: AuthService,
    private userService: UserService,
    private router: Router,
    private themeService: ThemeService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.userService.getProfile().subscribe({
      next: (res: any) => {
        this.user = res;
        this.initials = this.getInitials(res.name);
        this.cdr.markForCheck();
      }
    });

    // Subscribe to theme changes
    this.themeService.darkMode$.subscribe(isDark => {
      this.isDarkMode = isDark;
      this.cdr.markForCheck();
    });
  }

  toggleMenu() {
    this.menuOpen = !this.menuOpen;
    if (this.menuOpen) {
      this.notificationOpen = false;
    }
  }

  closeMenu() {
    this.menuOpen = false;
  }

  toggleNotifications() {
    this.notificationOpen = !this.notificationOpen;
    if (this.notificationOpen) {
      this.menuOpen = false;
      this.showAllNotifications = false;
    }
  }

  closeNotifications() {
    this.notificationOpen = false;
    this.showAllNotifications = false;
  }

  toggleAllNotifications() {
    this.showAllNotifications = !this.showAllNotifications;
  }

  markAsRead(notificationId: number) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification && !notification.read) {
      notification.read = true;
      this.toast.success('Notification marked as read', 2000);
    }
  }

  markAllAsRead() {
    const total = this.notifications.length;
    this.notifications = [];
    this.notificationOpen = false;
    this.showAllNotifications = false;
    if (total > 0) {
      this.toast.success(`All ${total} notifications cleared`, 2000);
    }
  }

  clearNotification(notificationId: number) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.toast.info('Notification cleared', 2000);
  }

  trackByNotifId(_: number, n: any): number { return n.id; }

  get unreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  get displayedNotifications() {
    return this.showAllNotifications ? this.notifications : this.notifications.slice(0, 3);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  getInitials(name: string): string {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();
  }

  // Close dropdown when clicking outside
  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event) {
    const target = event.target as HTMLElement;
    if (!target.closest('app-header')) {
      this.menuOpen = false;
      this.notificationOpen = false;
      this.showAllNotifications = false;
    }
  }
}
