import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService } from '../../../services/api.service';
import { SessionService } from '../../../services/session.service';
import { NotificationService } from '../../../services/notification.service';
import { NotificationComponent } from '../../../components/notification/notification.component';
import { SidebarWrapperComponent } from '../../../components/sidebar-wrapper/sidebar-wrapper.component';
import { ProfileComponent } from '../../../components/profile/profile.component';
import { UserService } from '../../../services/user.service';
import { ImageUrlService } from '../../../services/image-url.service';
import { PaymentService, PaymentResponse } from '../../../services/payment.service';
import { CourseReviewsModalComponent } from '../../../components/course-reviews-modal/course-reviews-modal.component';
import { PaymentModalComponent } from '../../payment-modal/payment-modal.component';
@Component({
  selector: 'app-courses',
  standalone: true,
  imports: [CommonModule, SidebarWrapperComponent, ProfileComponent, NotificationComponent, PaymentModalComponent, CourseReviewsModalComponent],
  templateUrl: './courses.component.html',
  styleUrls: ['./courses.component.scss']
})
export class CoursesComponent implements OnInit {
  courses: any[] = [];
  enrolledCourses: any[] = [];
  availableCourses: any[] = [];
  loading = false;
  userRole: string = '';
  userName: string = '';
  userId: number = 0;

  // Pagination properties
  currentPage = 1;
  itemsPerPage = 6; // Number of courses per page (3 columns x 3 rows)
  totalPages = 1;

  // Profile component properties
  username: string = '';
  avatarUrl: string = '';

  // Payment modal properties
  isPaymentModalVisible = false;
  selectedCourseForPayment: any = null;

  // Reviews modal properties
  isReviewsModalVisible = false;
  selectedCourseForReviews: any = null;
  
  // Login confirmation modal
  showLoginConfirmModal = false;

  constructor(
    private apiService: ApiService,
    public sessionService: SessionService,
    private notificationService: NotificationService,
    private router: Router,
    private userService: UserService,
    private imageUrlService: ImageUrlService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.initializeUserProfile();
    this.loadUserInfo();
    // Load courses cho tất cả trường hợp - có token hoặc không có token
    if (isPlatformBrowser(this.platformId)) {
      this.loadCourses();
    }
  }

  // Helper method để hiển thị thông báo
  private showAlert(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') {
    if (type === 'success') {
      this.notificationService.success('Thành công', message);
    } else if (type === 'error') {
      this.notificationService.error('Lỗi', message);
    } else if (type === 'warning') {
      this.notificationService.warning('Cảnh báo', message);
    } else {
      this.notificationService.info('Thông báo', message);
    }
  }

  // Hiển thị thông báo yêu cầu đăng nhập
  private showLoginRequiredAlert() {
    this.showLoginConfirmModal = true;
  }

  closeLoginConfirmModal() {
    this.showLoginConfirmModal = false;
  }

  goToLogin() {
    this.notificationService.show({
      type: 'info',
      title: 'Chuyển hướng',
      message: 'Đang chuyển đến trang đăng nhập...'
    });
    this.closeLoginConfirmModal();
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.notificationService.show({
      type: 'info', 
      title: 'Chuyển hướng',
      message: 'Đang chuyển đến trang đăng ký...'
    });
    this.closeLoginConfirmModal();
    this.router.navigate(['/signup']);
  }

  // Load thông tin user từ token hoặc API
  loadUserInfo() {
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Decode JWT token để lấy thông tin user
          const payload = JSON.parse(atob(token.split('.')[1]));
          console.log('JWT payload:', payload);
          this.userRole = payload.role || 'student';
          this.userName = payload.sub || 'Unknown';
          this.userId = payload.id || payload.userId || 0;
          console.log('User info loaded:', { role: this.userRole, name: this.userName, userId: this.userId });
        } catch (error) {
          console.error('Error decoding token:', error);
          this.userRole = '';
          this.userName = '';
          this.userId = 0;
        }
      } else {
        // Không có token - guest user
        this.userRole = '';
        this.userName = '';
        this.userId = 0;
        console.log('Guest user mode');
      }
    }
  }

  // Load danh sách khóa học theo role
  loadCourses() {
    this.loading = true;

    // Nếu không có token (guest user), chỉ hiển thị tất cả khóa học không có thông tin enrollment
    if (!this.userRole || this.userId === 0) {
      this.apiService.getPublicCoursesWithRatings().subscribe({
        next: (courses) => {
          this.courses = courses;
          this.enrolledCourses = [];
          this.availableCourses = courses;
          this.updatePagination(); // Add pagination update
          this.loading = false;
          console.log('Guest user courses loaded:', {
            total: courses.length,
            enrolled: 0,
            available: courses.length
          });
        },
        error: (err) => {
          // Với guest user, nếu lỗi thì hiển thị empty state
          this.courses = [];
          this.enrolledCourses = [];
          this.availableCourses = [];
          this.loading = false;
          console.log('Guest user - failed to load courses, showing empty state');
        }
      });
      return;
    }

    if (this.sessionService.isStudent()) {
      // Sinh viên: Lấy tất cả khóa học kèm trạng thái đăng ký
      this.apiService.getAllCoursesWithStatus(this.userId).subscribe({
        next: (courses) => {
          this.courses = courses;
          // Phân chia courses thành enrolled và available
          this.enrolledCourses = courses.filter(course => course.enrolled);
          this.availableCourses = courses.filter(course => !course.enrolled);
          this.updatePagination(); // Add pagination update
          this.loading = false;
          console.log('Student courses loaded:', {
            total: courses.length,
            enrolled: this.enrolledCourses.length,
            available: this.availableCourses.length
          });
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else if (this.sessionService.isInstructor()) {
      // Giảng viên: Chỉ lấy khóa học của mình
      this.apiService.getCoursesByUser().subscribe({
        next: (courses) => {
          this.courses = courses;
          this.loading = false;
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else if (this.sessionService.isAdmin()) {
      // Admin: Lấy tất cả khóa học để xem tổng quan
      this.apiService.getAllCourses().subscribe({
        next: (courses) => {
          this.courses = courses;
          this.loading = false;
        },
        error: (err) => {
          this.handleLoadError(err);
        }
      });
    } else {
      // Role không xác định: hiển thị trang trống
      this.courses = [];
      this.enrolledCourses = [];
      this.availableCourses = [];
      this.loading = false;
    }
  }

  // Load khóa học của giảng viên
  loadInstructorCourses() {
    this.apiService.getCoursesByUser().subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
        console.log('Instructor courses:', courses);

        if (courses.length === 0) {
          console.log('Instructor has no courses');
        }
      },
      error: (err) => {
        console.error('Lỗi khi tải khóa học của giảng viên:', err);
        this.courses = []; // Set empty array instead of keeping old data
        this.handleLoadError(err);
      }
    });
  }

  // Load khóa học sinh viên đã đăng ký
  loadStudentEnrolledCourses() {
    this.apiService.get<any[]>('/enrollments/my-courses').subscribe({
      next: (courses) => {
        this.courses = courses;
        this.loading = false;
        console.log('Student enrolled courses:', courses);

        if (courses.length === 0) {
          console.log('Student has no enrolled courses');
        }
      },
      error: (err) => {
        console.error('Lỗi khi tải khóa học đã đăng ký:', err);
        this.courses = []; // Set empty array instead of keeping old data
        this.handleLoadError(err);
      }
    });
  }

  // Xử lý lỗi khi load
  handleLoadError(err: any) {
    this.loading = false;
    if (err.status === 401) {
      this.showAlert('Bạn cần đăng nhập để xem khóa học', 'warning');
      this.router.navigate(['/login']);
    } else if (err.status === 403) {
      this.showAlert('Bạn không có quyền truy cập', 'error');
    } else {
      this.showAlert('Lỗi khi tải danh sách khóa học', 'error');
    }
  }

  // Vào trang học/quản lý khóa học
  enterCourse(course: any) {
    // Nếu chưa đăng nhập
    if (!this.userRole || this.userId === 0) {
      this.showLoginRequiredAlert();
      return;
    }

    if (this.sessionService.isInstructor()) {
      this.router.navigate(['/course-home'], { queryParams: { courseId: course.courseId } });
    } else if (this.sessionService.isStudent()) {
      if (course.enrolled) {
        this.router.navigate(['/course-home'], {
          queryParams: {
            courseId: course.courseId,
            courseName: course.title
          }
        });
      } else {
        // Kiểm tra khóa học có phí hay miễn phí
        if (course.price && course.price > 0) {
          // Khóa học có phí -> hiển thị payment modal
          this.showPaymentModal(course);
        } else {
          // Khóa học miễn phí -> đăng ký trực tiếp
          this.registerFreeCourse(course);
        }
      }
    } else {
      // Admin hoặc role khác
      this.router.navigate(['/course-home'], {
        queryParams: {
          courseId: course.courseId,
          courseName: course.title
        }
      });
    }
  }

  // Hiển thị payment modal cho khóa học có phí
  showPaymentModal(course: any) {
    this.selectedCourseForPayment = {
      courseId: course.courseId,
      title: course.title || course.courseTitle,
      description: course.description,
      price: course.price,
      imageUrl: course.thumbnailUrl,
      instructorName: course.instructorName || 'Chưa có thông tin'
    };
    this.isPaymentModalVisible = true;
  }

  // Đăng ký khóa học miễn phí
  registerFreeCourse(course: any) {
    if (confirm('Bạn chưa đăng ký khóa học này. Đăng ký ngay?')) {
      this.loading = true;
      this.apiService.post('/enrollments/register', { courseId: course.courseId })
        .subscribe({
          next: (response: any) => {
            this.loading = false;

            if (response && response.success) {
              this.showAlert(response.message || 'Đăng ký thành công!', 'success');
              course.enrolled = true;
              this.router.navigate(['/course-home'], {
                queryParams: {
                  courseId: course.courseId,
                  courseName: course.title
                }
              });
            } else {
              this.showAlert(response?.message || 'Có lỗi xảy ra!');
            }
          },
          error: (error) => {
            this.loading = false;
            this.handleEnrollmentError(error, course);
          }
        });
    }
  }

  // Xử lý lỗi đăng ký
  handleEnrollmentError(error: any, course: any) {
    if (error.status === 400 && error.error && error.error.message) {
      this.showAlert(error.error.message);
      if (error.error.message.includes('đã đăng ký')) {
        course.enrolled = true;
      }
    } else if (error.status === 401) {
      this.showAlert('Bạn cần đăng nhập để đăng ký khóa học!');
      this.router.navigate(['/login']);
    } else if (error.status === 403) {
      this.showAlert('Bạn không có quyền đăng ký khóa học này!');
    } else {
      let errorMessage = 'Đăng ký thất bại: ';
      if (error.error && typeof error.error === 'string') {
        errorMessage += error.error;
      } else if (error.error && error.error.message) {
        errorMessage += error.error.message;
      } else if (error.message) {
        errorMessage += error.message;
      } else {
        errorMessage += 'Lỗi không xác định';
      }
      this.showAlert(errorMessage);
    }
  }

  // Đóng payment modal
  closePaymentModal() {
    this.isPaymentModalVisible = false;
    this.selectedCourseForPayment = null;
  }

  // Xử lý khi thanh toán thành công
  onPaymentSuccess(response: PaymentResponse) {
    this.showAlert('Thanh toán thành công! Bạn đã được đăng ký vào khóa học.', 'success');

    // Cập nhật trạng thái enrolled cho course
    if (this.selectedCourseForPayment) {
      const course = this.availableCourses.find(c => c.courseId === this.selectedCourseForPayment.courseId);
      if (course) {
        course.enrolled = true;
        // Di chuyển từ available sang enrolled
        this.enrolledCourses.push(course);
        this.availableCourses = this.availableCourses.filter(c => c.courseId !== course.courseId);
      }
    }

    this.closePaymentModal();

    // Reload courses để đảm bảo data mới nhất
    setTimeout(() => {
      this.loadCourses();
    }, 1000);
  }

  // Xem chi tiết khóa học -> chuyển sang trang course-home
  viewCourseDetails(course: any) {
    if (this.sessionService.isInstructor()) {
      // Giảng viên: Chuyển sang trang course-home
      this.router.navigate(['/course-home'], {
        queryParams: {
          courseId: course.courseId,
          courseName: course.title
        }
      });
    } else if (this.sessionService.isStudent()) {
      // Sinh viên: Chuyển sang trang course-home
      this.router.navigate(['/course-home'], {
        queryParams: {
          courseId: course.courseId,
          courseName: course.title
        }
      });
    } else {
      // Admin hoặc role khác
      this.router.navigate(['/course-home'], {
        queryParams: {
          courseId: course.courseId,
          courseName: course.title
        }
      });
    }
  }

  // Xem đánh giá khóa học
  viewCourseReviews(course: any) {
    // Hiển thị modal đánh giá - guest có thể xem đánh giá nhưng không thể viết
    this.selectedCourseForReviews = {
      courseId: course.courseId,
      courseName: this.getCourseTitle(course),
      canWriteReview: this.userRole && course.enrolled || false, // Chỉ cho phép viết đánh giá nếu đã đăng nhập và đăng ký
      courseInfo: {
        courseId: course.courseId,
        title: this.getCourseTitle(course),
        description: this.getCourseDescription(course),
        price: this.getCoursePrice(course),
        thumbnailUrl: course.thumbnailUrl,
        categoryName: course.categoryName,
        instructorName: course.instructorName
      },
      userLoggedIn: this.isLoggedIn(),
      isEnrolled: course.enrolled || false
    };
    this.isReviewsModalVisible = true;
  }

  // Đóng reviews modal
  closeReviewsModal() {
    this.isReviewsModalVisible = false;
    this.selectedCourseForReviews = null;
  }

  // Format giá tiền
  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  // Format ngày
  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  // Helper methods để handle khác nhau giữa CourseDTO và EnrollmentsDTO
  getCourseTitle(course: any): string {
    return course.title || course.courseTitle || course.courseName || 'Không có tiêu đề';
  }

  getCourseDescription(course: any): string {
    return course.description || 'Không có mô tả';
  }

  // Get image URL using ImageUrlService
  getImageUrl(imageUrl: string | null | undefined): string {
    return this.imageUrlService.getImageUrl(imageUrl, 'assets/pictures/default-course.png');
  }

  getCoursePrice(course: any): number {
    return course.price || 0;
  }

  getCourseCreatedDate(course: any): string {
    return course.createdAt || course.enrolledAt || new Date().toISOString();
  }

  // Tạo array sao để hiển thị rating
  getStarArray(rating: number): boolean[] {
    const stars: boolean[] = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(true); // Sao đầy
      } else if (i === fullStars && hasHalfStar) {
        stars.push(true); // Sao nửa (hiển thị như sao đầy cho đơn giản)
      } else {
        stars.push(false); // Sao rỗng
      }
    }
    return stars;
  }

  // Initialize user profile data from session
  private initializeUserProfile() {
    const userInfo = this.userService.getCurrentUserInfo();
    this.username = userInfo.username;
    this.userRole = userInfo.role; // Giữ nguyên role gốc để sử dụng trong logic
    this.avatarUrl = userInfo.avatarUrl; // ✅ Sử dụng avatar mặc định từ service
  }

  // Format role để hiển thị với chữ cái đầu viết hoa
  getDisplayRole(role: string): string {
    const cleanRole = role.replace('ROLE_', '').toLowerCase();
    switch (cleanRole) {
      case 'admin': return 'Admin';
      case 'instructor': return 'Instructor';
      case 'student': return 'Student';
      default: return cleanRole.charAt(0).toUpperCase() + cleanRole.slice(1);
    }
  }

  // Profile component event handlers
  onProfileUpdate() {
    // Profile update requested
  }

  onLogout() {
    this.sessionService.logout();
  }

  // Navigation methods for guest users
  navigateToLogin() {
    this.router.navigate(['/login']);
  }

  navigateToSignup() {
    this.router.navigate(['/signup']);
  }

  // Check if user is logged in
  isLoggedIn(): boolean {
    return !!(this.userRole && this.userId > 0);
  }

  // Handle enrollment from reviews modal
  onEnrollFromModal(courseId: number) {
    console.log('Enrolling in course from modal:', courseId);
    
    // Check if user is logged in
    if (!this.sessionService.getCurrentUser()) {
      this.notificationService.show({
        type: 'warning',
        title: 'Yêu cầu đăng nhập',
        message: 'Bạn cần đăng nhập để đăng ký khóa học.'
      });
      return;
    }

    // Find the course
    const course = this.courses.find(c => c.courseId === courseId);
    if (!course) {
      this.notificationService.show({
        type: 'error',
        title: 'Lỗi',
        message: 'Không tìm thấy thông tin khóa học.'
      });
      return;
    }

    // Check if it's a free course
    if (course.price === 0) {
      // For free courses, directly enroll
      this.enrollInFreeCourse(courseId);
    } else {
      // For paid courses, open payment modal
      this.closeReviewsModal(); // Close reviews modal first
      this.selectedCourseForPayment = course;
      this.isPaymentModalVisible = true;
    }
  }

  // Enroll in free course
  enrollInFreeCourse(courseId: number) {
    this.apiService.post(`/enrollments/enroll/${courseId}`, {}).subscribe({
      next: (response) => {
        this.notificationService.show({
          type: 'success',
          title: 'Đăng ký thành công',
          message: 'Bạn đã đăng ký khóa học miễn phí thành công!'
        });
        
        // Close modal and refresh courses
        this.closeReviewsModal();
        this.loadCourses();
      },
      error: (error) => {
        console.error('Error enrolling in free course:', error);
        this.notificationService.show({
          type: 'error',
          title: 'Lỗi đăng ký',
          message: error.error?.message || 'Không thể đăng ký khóa học. Vui lòng thử lại sau.'
        });
      }
    });
  }

  // Pagination methods
  get paginatedAvailableCourses(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.availableCourses.slice(startIndex, endIndex);
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.availableCourses.length / this.itemsPerPage);
    if (this.currentPage > this.totalPages) {
      this.currentPage = Math.max(1, this.totalPages);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPages = 5; // Show maximum 5 page numbers
    
    if (this.totalPages <= maxPages) {
      // Show all pages if total is small
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Show pages around current page
      const start = Math.max(1, this.currentPage - 2);
      const end = Math.min(this.totalPages, this.currentPage + 2);
      
      for (let i = start; i <= end; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }
}
