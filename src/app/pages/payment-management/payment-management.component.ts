import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PaymentService } from '../../services/payment.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-payment-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container mt-4">
      <h2>Payment Management Panel</h2>
      
      <!-- Config Status -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="card">
            <div class="card-header d-flex justify-content-between align-items-center">
              <h5>🔧 Payment Gateway Configuration</h5>
              <button class="btn btn-sm btn-info" (click)="checkConfig()" [disabled]="loading">
                <i class="fas fa-sync" [class.fa-spin]="loading"></i> Refresh
              </button>
            </div>
            <div class="card-body">
              <div *ngIf="configStatus" class="row">
                <div class="col-md-8">
                  <table class="table table-sm">
                    <tr>
                      <td><strong>TMN Code:</strong></td>
                      <td>
                        <span class="badge" [class]="configStatus.tmnCodeExists ? 'bg-success' : 'bg-danger'">
                          {{ configStatus.tmnCodeExists ? '✓ Set' : '✗ Missing' }}
                        </span>
                        <code class="ms-2">{{ configStatus.tmnCode || 'Not set' }}</code>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Hash Secret:</strong></td>
                      <td>
                        <span class="badge" [class]="configStatus.hashSecretExists ? 'bg-success' : 'bg-danger'">
                          {{ configStatus.hashSecretExists ? '✓ Set' : '✗ Missing' }}
                        </span>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Pay URL:</strong></td>
                      <td>
                        <span class="badge" [class]="configStatus.payUrlExists ? 'bg-success' : 'bg-danger'">
                          {{ configStatus.payUrlExists ? '✓ Set' : '✗ Missing' }}
                        </span>
                        <code class="ms-2">{{ configStatus.payUrl || 'Not set' }}</code>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Return URL:</strong></td>
                      <td>
                        <span class="badge" [class]="configStatus.returnUrlExists ? 'bg-success' : 'bg-danger'">
                          {{ configStatus.returnUrlExists ? '✓ Set' : '✗ Missing' }}
                        </span>
                        <code class="ms-2">{{ configStatus.returnUrl || 'Not set' }}</code>
                      </td>
                    </tr>
                    <tr>
                      <td><strong>Overall Status:</strong></td>
                      <td>
                        <span class="badge fs-6" [class]="configStatus.isValid ? 'bg-success' : 'bg-danger'">
                          {{ configStatus.isValid ? '✅ READY' : '❌ NOT READY' }}
                        </span>
                      </td>
                    </tr>
                  </table>
                </div>
                <div class="col-md-4">
                  <div class="alert" [class]="configStatus.isValid ? 'alert-success' : 'alert-warning'">
                    <h6>{{ configStatus.isValid ? 'Configuration OK' : 'Configuration Issues' }}</h6>
                    <p class="mb-0">
                      {{ configStatus.isValid 
                        ? 'Payment gateway is ready to use' 
                        : 'Please check environment variables' }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Payment Test -->
      <div class="row">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h5>💳 Payment Gateway Test</h5>
            </div>
            <div class="card-body">
              <form (ngSubmit)="testPayment()" #testForm="ngForm">
                <div class="row">
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Course ID</label>
                      <input 
                        type="number" 
                        class="form-control" 
                        [(ngModel)]="testData.courseId"
                        name="courseId"
                        required
                        min="1">
                    </div>
                  </div>
                  <div class="col-md-6">
                    <div class="mb-3">
                      <label class="form-label">Amount (VND)</label>
                      <input 
                        type="number" 
                        class="form-control" 
                        [(ngModel)]="testData.amount"
                        name="amount"
                        required
                        min="10000"
                        step="1000">
                    </div>
                  </div>
                </div>
                <div class="mb-3">
                  <label class="form-label">Order Info</label>
                  <input 
                    type="text" 
                    class="form-control" 
                    [(ngModel)]="testData.orderInfo"
                    name="orderInfo"
                    required>
                </div>
                
                <div class="d-flex gap-2">
                  <button 
                    type="submit" 
                    class="btn btn-primary" 
                    [disabled]="loading || !testForm.form.valid || !isAuthenticated">
                    <i class="fas fa-credit-card me-2"></i>
                    Test Payment
                  </button>
                  
                  <button 
                    type="button" 
                    class="btn btn-secondary" 
                    (click)="checkAuth()"
                    [disabled]="loading">
                    <i class="fas fa-user me-2"></i>
                    Check Auth
                  </button>
                </div>
                
                <div *ngIf="!isAuthenticated" class="alert alert-warning mt-3">
                  <i class="fas fa-exclamation-triangle me-2"></i>
                  You must be logged in to test payments
                </div>
              </form>
            </div>
          </div>
        </div>
        
        <!-- Test Cards Info -->
        <div class="col-md-4">
          <div class="card">
            <div class="card-header">
              <h6>📱 Test Payment Cards (Sandbox)</h6>
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
              <hr>
              <small class="text-muted">
                Use these test cards in payment gateway sandbox environment
              </small>
            </div>
          </div>
        </div>
      </div>

      <!-- Results -->
      <div class="row mt-4" *ngIf="result">
        <div class="col-12">
          <div class="card">
            <div class="card-header">
              <h5>📋 Test Results</h5>
            </div>
            <div class="card-body">
              <div class="alert" [class]="result.success ? 'alert-success' : 'alert-danger'">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <h6>{{ result.success ? '✅ Success' : '❌ Error' }}</h6>
                    <p class="mb-0">{{ result.message }}</p>
                  </div>
                  <button 
                    *ngIf="result.success && result.paymentUrl" 
                    class="btn btn-sm btn-primary"
                    (click)="openPaymentUrl(result.paymentUrl)">
                    Open Payment URL
                  </button>
                </div>
              </div>
              
              <details *ngIf="result" class="mt-3">
                <summary class="btn btn-sm btn-outline-secondary">View Raw Response</summary>
                <pre class="mt-2 bg-light p-3 rounded">{{ result | json }}</pre>
              </details>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading -->
      <div *ngIf="loading" class="text-center my-4">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="mt-2">Processing...</p>
      </div>
    </div>
  `,
  styles: [`
    .badge {
      font-size: 0.8em;
    }
    
    code {
      background-color: #f8f9fa;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 0.9em;
    }
    
    .alert h6 {
      margin-bottom: 0.5rem;
    }
    
    pre {
      font-size: 0.85em;
      max-height: 300px;
      overflow-y: auto;
    }
  `]
})
export class PaymentManagementComponent implements OnInit {
  loading = false;
  configStatus: any = null;
  result: any = null;
  isAuthenticated = false;

  testData = {
    courseId: 1,
    amount: 500000,
    orderInfo: 'Test payment for course 1 - Payment gateway integration test'
  };

  constructor(
    private paymentService: PaymentService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.checkAuth();
    this.checkConfig();
  }

  checkAuth() {
    this.isAuthenticated = this.authService.isAuthenticated();
    console.log('Auth status:', this.isAuthenticated);
  }

  async checkConfig() {
    this.loading = true;
    try {
      this.configStatus = await this.paymentService.getVNPayConfig().toPromise();
      console.log('Payment Gateway Config:', this.configStatus);
    } catch (error: any) {
      console.error('Error checking config:', error);
      this.result = {
        success: false,
        message: 'Failed to check payment gateway configuration: ' + (error.error?.message || error.message)
      };
    } finally {
      this.loading = false;
    }
  }

  async testPayment() {
    if (!this.isAuthenticated) {
      this.result = {
        success: false,
        message: 'Please login first to test payments'
      };
      return;
    }

    if (!this.configStatus?.isValid) {
      this.result = {
        success: false,
        message: 'Payment gateway configuration is not valid. Please check environment variables.'
      };
      return;
    }

    this.loading = true;
    this.result = null;

    try {
      const response = await this.paymentService.createVNPayPayment(this.testData).toPromise();
      this.result = response;
      console.log('Payment test result:', response);
    } catch (error: any) {
      console.error('Payment test error:', error);
      this.result = {
        success: false,
        message: error.error?.message || error.message || 'Payment test failed',
        error: error.error
      };
    } finally {
      this.loading = false;
    }
  }

  openPaymentUrl(url: string) {
    window.open(url, '_blank', 'width=800,height=600,scrollbars=yes,resizable=yes');
  }
}
