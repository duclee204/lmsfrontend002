import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SidebaradminComponent } from '../../../components/sidebaradmin/sidebaradmin.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { CourseService } from '../../../services/course.service';
import { PaymentService } from '../../../services/payment.service';

interface DashboardStats {
  totalUsers: number;
  totalCourses: number;
  totalPayments: number;
  totalCategories: number;
}

interface RecentActivity {
  id: string;
  type: 'user_registration' | 'course_created' | 'payment_completed' | 'course_enrolled';
  description: string;
  timestamp: string;
  user?: string;
  course?: string;
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, SidebaradminComponent, ProfileComponent, NotificationComponent],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  
  userName: string = '';
  userRole: string = '';
  
  // Profile component properties
  username: string = '';
  avatarUrl: string = '';

  // Dashboard data
  dashboardStats: DashboardStats = {
    totalUsers: 0,
    totalCourses: 0,
    totalPayments: 0,
    totalCategories: 0
  };

  recentActivities: RecentActivity[] = [];
  isLoading = true;

  constructor(
    private sessionService: SessionService, 
    private userService: UserService,
    private courseService: CourseService,
    private paymentService: PaymentService,
    private router: Router
  ) {}

  ngOnInit() {
    this.initializeUserProfile();
    this.loadDashboardData();
  }

  initializeUserProfile() {
    const userInfo = this.userService.getCurrentUserInfo();
    this.userName = userInfo.username;
    this.userRole = userInfo.role; // Giữ nguyên role gốc
    this.username = userInfo.username;
    this.avatarUrl = userInfo.avatarUrl; // ✅ Sử dụng avatar mặc định từ service
  }

  async loadDashboardData() {
    try {
      this.isLoading = true;

      // Load dashboard statistics
      await Promise.all([
        this.loadUserStats(),
        this.loadCourseStats(),
        this.loadPaymentStats(),
        this.loadRecentActivities()
      ]);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.isLoading = false;
    }
  }

  async loadUserStats() {
    try {
      // Simulate user count - trong thực tế sẽ call API
      this.dashboardStats.totalUsers = 25; // Placeholder
    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async loadCourseStats() {
    try {
      const courses = await this.courseService.getCourses().toPromise();
      this.dashboardStats.totalCourses = courses?.length || 0;
    } catch (error) {
      console.error('Error loading course stats:', error);
      this.dashboardStats.totalCourses = 0;
    }
  }

  async loadPaymentStats() {
    try {
      const payments = await this.paymentService.getAllPaymentHistory().toPromise();
      this.dashboardStats.totalPayments = payments?.length || 0;
    } catch (error) {
      console.error('Error loading payment stats:', error);
      this.dashboardStats.totalPayments = 0;
    }
  }

  async loadRecentActivities() {
    try {
      const activities: RecentActivity[] = [];

      // Load recent courses
      const courses = await this.courseService.getCourses().toPromise();
      if (courses && courses.length > 0) {
        courses.slice(0, 3).forEach((course: any, index: number) => {
          activities.push({
            id: `course-${course.courseId}`,
            type: 'course_created',
            description: `Khóa học "${course.title}" được tạo`,
            timestamp: this.getRelativeTime(course.createdAt || new Date()),
            course: course.title
          });
        });
      }

      // Load recent payments
      const payments = await this.paymentService.getAllPaymentHistory().toPromise();
      if (payments && payments.length > 0) {
        payments.slice(0, 2).forEach((payment: any) => {
          if (payment.status === 'completed') {
            activities.push({
              id: `payment-${payment.paymentId}`,
              type: 'payment_completed',
              description: `Thanh toán thành công cho khóa học "${payment.courseTitle}" - ${this.formatCurrency(payment.amount)}`,
              timestamp: this.getRelativeTime(payment.paidAt || payment.createdAt),
              user: payment.userName || 'Người dùng'
            });
          }
        });
      }

      // Sort by timestamp (most recent first)
      this.recentActivities = activities
        .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 5);

    } catch (error) {
      console.error('Error loading recent activities:', error);
      this.recentActivities = [];
    }
  }

  // Navigation methods
  navigateTo(route: string) {
    this.router.navigate([route]);
  }

  // Helper methods
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(amount);
  }

  getRelativeTime(dateTime: string | Date): string {
    const now = new Date();
    const date = new Date(dateTime);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));

    if (diffInMinutes < 1) return 'Vừa xong';
    if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} giờ trước`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays} ngày trước`;
    
    return date.toLocaleDateString('vi-VN');
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'user_registration': return '👤';
      case 'course_created': return '📚';
      case 'payment_completed': return '💰';
      case 'course_enrolled': return '✅';
      default: return '📝';
    }
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
}
