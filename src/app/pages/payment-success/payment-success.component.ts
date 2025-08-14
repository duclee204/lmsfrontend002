import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-payment-success',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="payment-result-container">
      <div class="card" [ngClass]="{'success': isSuccess, 'error': !isSuccess}">
        <div class="icon">
          <i [class]="isSuccess ? 'fas fa-check-circle' : 'fas fa-times-circle'"></i>
        </div>
        
        <h2>{{ isSuccess ? 'Thanh toán thành công!' : 'Thanh toán thất bại!' }}</h2>
        
        <div class="details" *ngIf="paymentDetails">
          <p><strong>Mã giao dịch:</strong> {{ paymentDetails.transactionId }}</p>
          <p><strong>Số tiền:</strong> {{ paymentDetails.amount | currency:'VND' }}</p>
          <p><strong>Thời gian:</strong> {{ paymentDetails.timestamp | date:'dd/MM/yyyy HH:mm:ss' }}</p>
          <p *ngIf="paymentDetails.responseCode"><strong>Mã phản hồi:</strong> {{ paymentDetails.responseCode }}</p>
        </div>

        <div class="message">
          <p>{{ message }}</p>
        </div>

        <div class="actions">
          <button class="btn btn-primary" (click)="goToCourses()">
            {{ isSuccess ? 'Xem khóa học' : 'Quay lại' }}
          </button>
          <button class="btn btn-secondary" (click)="goToHome()">Trang chủ</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .payment-result-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 80vh;
      padding: 20px;
    }

    .card {
      background: white;
      border-radius: 10px;
      padding: 40px;
      text-align: center;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      max-width: 500px;
      width: 100%;
    }

    .card.success {
      border-top: 5px solid #28a745;
    }

    .card.error {
      border-top: 5px solid #dc3545;
    }

    .icon {
      font-size: 4rem;
      margin-bottom: 20px;
    }

    .success .icon {
      color: #28a745;
    }

    .error .icon {
      color: #dc3545;
    }

    h2 {
      margin-bottom: 30px;
      color: #333;
    }

    .details {
      background: #f8f9fa;
      padding: 20px;
      border-radius: 5px;
      margin: 20px 0;
      text-align: left;
    }

    .details p {
      margin: 10px 0;
      color: #666;
    }

    .message {
      margin: 20px 0;
      color: #666;
    }

    .actions {
      margin-top: 30px;
    }

    .btn {
      padding: 10px 20px;
      margin: 0 10px;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
      text-decoration: none;
      display: inline-block;
    }

    .btn-primary {
      background-color: #007bff;
      color: white;
    }

    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }

    .btn:hover {
      opacity: 0.9;
    }
  `]
})
export class PaymentSuccessComponent implements OnInit {
  isSuccess = false;
  message = '';
  paymentDetails: any = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private paymentService: PaymentService
  ) {}

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      // Lấy transaction_id từ params
      const transactionId = params['transaction_id'];
      
      if (params['vnp_ResponseCode']) {
        // Xử lý callback từ VNPay
        this.handleVNPayCallback(params);
      } else if (transactionId) {
        // Kiểm tra trạng thái payment
        this.checkPaymentStatus(transactionId);
      } else {
        this.showError('Không tìm thấy thông tin giao dịch');
      }
    });
  }

  private handleVNPayCallback(params: any) {
    const responseCode = params['vnp_ResponseCode'];
    const transactionId = params['vnp_TxnRef'];
    const amount = params['vnp_Amount'];
    
    this.paymentDetails = {
      transactionId: transactionId,
      amount: amount ? parseInt(amount) / 100 : 0,
      responseCode: responseCode,
      timestamp: new Date()
    };

    if (responseCode === '00') {
      // Thanh toán thành công
      this.isSuccess = true;
      this.message = 'Bạn đã thanh toán thành công và được đăng ký vào khóa học!';
    } else {
      // Thanh toán thất bại
      this.isSuccess = false;
      this.message = 'Giao dịch không thành công. Vui lòng thử lại sau.';
    }
    
    // 🔧 FIX: Gọi API confirm cho cả success và failed
    this.confirmPayment(transactionId);
  }

  private confirmPayment(transactionId: string) {
    // Gửi toàn bộ query params để backend xử lý
    const queryString = window.location.search;
    
    this.paymentService.confirmVNPayPayment(queryString).subscribe({
      next: (response: any) => {
        if (response.success) {
          this.message = response.message || 'Thanh toán thành công và đã đăng ký khóa học!';
        } else {
          this.message = 'Thanh toán thành công nhưng có lỗi khi xác nhận. Vui lòng liên hệ hỗ trợ.';
        }
      },
      error: (error) => {
        console.error('Error confirming payment:', error);
        this.message = 'Thanh toán thành công nhưng có lỗi khi xác nhận. Vui lòng liên hệ hỗ trợ.';
      }
    });
  }

  private checkPaymentStatus(transactionId: string) {
    console.log('Checking payment status for transaction:', transactionId);
    
    this.paymentService.checkPaymentByTransaction(transactionId).subscribe({
      next: (response: any) => {
        console.log('Payment status response:', response);
        if (response.found && response.payment) {
          const payment = response.payment;
          this.paymentDetails = {
            transactionId: payment.transactionId,
            amount: payment.amount,
            timestamp: new Date(payment.createdAt || payment.paidAt)
          };
          
          if (payment.status === 'completed') {
            this.isSuccess = true;
            this.message = 'Thanh toán đã được xác nhận thành công!';
          } else if (payment.status === 'pending') {
            this.isSuccess = false;
            this.message = 'Thanh toán đang chờ xử lý. Vui lòng kiểm tra lại sau.';
          } else {
            this.isSuccess = false;
            this.message = 'Thanh toán không thành công.';
          }
        } else {
          this.showError('Không tìm thấy thông tin giao dịch');
        }
      },
      error: (error) => {
        console.error('Error checking payment status:', error);
        this.showError('Lỗi khi kiểm tra trạng thái thanh toán');
      }
    });
  }

  private showError(message: string) {
    this.isSuccess = false;
    this.message = message;
  }

  goToCourses() {
    this.router.navigate(['/courses']);
  }

  goToHome() {
    this.router.navigate(['/']);
  }
}
