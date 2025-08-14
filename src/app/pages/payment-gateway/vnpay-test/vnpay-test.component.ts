import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';

@Component({
  selector: 'app-payment-gateway',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <h2>Payment Gateway Test</h2>
      
      <div class="row">
        <div class="col-md-8">
          <!-- Payment Gateway Config Check -->
          <div class="card mb-4">
            <div class="card-header">
              <h5>Payment Gateway Configuration</h5>
            </div>
            <div class="card-body">
              <button class="btn btn-info" (click)="checkPaymentConfig()" [disabled]="isLoading">
                <i class="fas fa-check-circle me-2"></i>
                Check Payment Config
              </button>
              
              <div *ngIf="paymentConfig" class="mt-3">
                <h6>Config Status:</h6>
                <pre>{{ paymentConfig | json }}</pre>
              </div>
            </div>
          </div>

          <!-- Payment Gateway Test -->
          <div class="card mb-4">
            <div class="card-header">
              <h5>Payment Gateway Test</h5>
            </div>
            <div class="card-body">
              <div class="row">
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">Course ID</label>
                    <input type="number" class="form-control" [(ngModel)]="testPayment.courseId">
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="mb-3">
                    <label class="form-label">Amount (VND)</label>
                    <input type="number" class="form-control" [(ngModel)]="testPayment.amount">
                  </div>
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label">Order Info</label>
                <input type="text" class="form-control" [(ngModel)]="testPayment.orderInfo">
              </div>
              
              <button 
                class="btn btn-primary" 
                (click)="testPaymentGateway()" 
                [disabled]="isLoading"
              >
                <i class="fas fa-credit-card me-2"></i>
                Test Payment Gateway
              </button>
              
              <div *ngIf="paymentResult" class="mt-3">
                <h6>Payment Result:</h6>
                <div class="alert" [ngClass]="paymentResult.success ? 'alert-success' : 'alert-danger'">
                  <strong>{{ paymentResult.success ? 'Success' : 'Error' }}:</strong> 
                  {{ paymentResult.message }}
                </div>
                <pre *ngIf="paymentResult.paymentUrl">{{ paymentResult | json }}</pre>
              </div>
            </div>
          </div>

          <!-- Loading -->
          <div *ngIf="isLoading" class="text-center">
            <div class="spinner-border text-primary" role="status">
              <span class="visually-hidden">Loading...</span>
            </div>
          </div>

          <!-- Error -->
          <div *ngIf="errorMessage" class="alert alert-danger">
            <i class="fas fa-exclamation-circle me-2"></i>
            {{ errorMessage }}
          </div>
        </div>
        
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h6>Test Payment Cards (Sandbox)</h6>
            </div>
            <div class="card-body">
              <div class="mb-3">
                <strong>NCB Bank</strong><br>
                <code>9704198526191432198</code><br>
                <small class="text-muted">NGUYEN VAN A - 07/15</small>
              </div>
              <div class="mb-3">
                <strong>Techcombank</strong><br>
                <code>9704061006060005047</code><br>
                <small class="text-muted">NGUYEN VAN A - 11/19</small>
              </div>
              <div class="mb-3">
                <strong>OTP SMS</strong><br>
                <code class="text-primary">123456</code><br>
                <small class="text-muted">Verification code</small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class PaymentGatewayComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  paymentConfig: any = null;
  paymentResult: any = null;

  testPayment = {
    courseId: 1,
    amount: 500000,
    orderInfo: 'Test payment for course 1'
  };

  constructor(private paymentService: PaymentService) {}

  ngOnInit() {
    this.checkPaymentConfig();
  }

  async checkPaymentConfig() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      this.paymentConfig = await this.paymentService.getVNPayConfig().toPromise();
    } catch (error: any) {
      console.error('Error checking payment config:', error);
      this.errorMessage = error.message || 'Failed to check payment configuration';
    } finally {
      this.isLoading = false;
    }
  }

  async testPaymentGateway() {
    this.isLoading = true;
    this.errorMessage = '';
    this.paymentResult = null;

    try {
      this.paymentResult = await this.paymentService.createVNPayPayment(this.testPayment).toPromise();
      
      if (this.paymentResult.success && this.paymentResult.paymentUrl) {
        // Optionally open payment URL
        const openUrl = confirm('Open payment URL in new tab?');
        if (openUrl) {
          window.open(this.paymentResult.paymentUrl, '_blank');
        }
      }
    } catch (error: any) {
      console.error('Error testing payment gateway:', error);
      this.errorMessage = error.error?.message || error.message || 'Failed to test payment gateway';
    } finally {
      this.isLoading = false;
    }
  }
}
