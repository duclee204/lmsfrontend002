import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PaymentService, PaymentHistory } from '../../services/payment.service';
import { SidebarWrapperComponent } from '../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../components/profile/profile.component';
import { SessionService } from '../../services/session.service';
import { UserService } from '../../services/user.service';

@Component({
  selector: 'app-payment-history',
  standalone: true,
  imports: [CommonModule, SidebarWrapperComponent, ProfileComponent],
  templateUrl: './payment-history.component.html',
  styleUrls: ['./payment-history.component.scss']
})
export class PaymentHistoryComponent implements OnInit {
  payments: PaymentHistory[] = [];
  isLoading = true;
  errorMessage = '';

  // Profile component properties
  username: string = '';
  avatarUrl: string = '';
  userRole: string = '';

  constructor(
    private paymentService: PaymentService,
    private sessionService: SessionService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.initializeUserProfile();
    this.loadPaymentHistory();
  }

  initializeUserProfile() {
    const userInfo = this.userService.getCurrentUserInfo();
    this.username = userInfo.username;
    this.userRole = userInfo.role;
    this.avatarUrl = userInfo.avatarUrl;
  }

  // Format role để hiển thị (chữ cái đầu viết hoa)
  getDisplayRole(role: string): string {
    const cleanRole = role.replace('ROLE_', '').toLowerCase();
    return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
  }

  // Profile component event handlers
  onProfileUpdate() {
    console.log('Profile update requested');
  }

  onLogout() {
    this.sessionService.logout();
  }

  async loadPaymentHistory() {
    this.isLoading = true;
    this.errorMessage = '';

    try {
      // Admin xem tất cả giao dịch, user thường chỉ xem của mình
      if (this.userRole === 'admin') {
        this.payments = await this.paymentService.getAllPaymentHistory().toPromise() || [];
      } else {
        this.payments = await this.paymentService.getPaymentHistory().toPromise() || [];
      }
    } catch (error: any) {
      console.error('Error loading payment history:', error);
      this.errorMessage = 'Có lỗi xảy ra khi tải lịch sử thanh toán';
    } finally {
      this.isLoading = false;
    }
  }

  async retryCallback(payment: PaymentHistory) {
    if (payment.status !== 'pending') {
      return;
    }

    try {
      const response = await this.paymentService.simulatePaymentCallback(
        payment.transactionId, 
        'success'
      ).toPromise();

      if (response && response.success) {
        // Reload payment history
        await this.loadPaymentHistory();
      }
    } catch (error) {
      console.error('Error simulating callback:', error);
    }
  }

  formatCurrency(amount: number): string {
    return this.paymentService.formatCurrency(amount);
  }

  formatDate(dateString: string): string {
    return this.paymentService.formatDate(dateString);
  }

  getPaymentMethodName(method: string): string {
    return this.paymentService.getPaymentMethodName(method);
  }

  getStatusClass(status: string): string {
    return this.paymentService.getStatusClass(status);
  }

  getStatusName(status: string): string {
    return this.paymentService.getStatusName(status);
  }

  trackByPaymentId(index: number, payment: PaymentHistory): number {
    return payment.paymentId;
  }
}
