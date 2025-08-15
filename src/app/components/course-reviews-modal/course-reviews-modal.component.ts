import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { CourseReviewService, CourseReview } from '../../services/course-review.service';
import { SessionService } from '../../services/session.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-course-reviews-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './course-reviews-modal.component.html',
  styleUrls: ['./course-reviews-modal.component.scss']
})
export class CourseReviewsModalComponent implements OnInit, OnChanges {
  @Input() isVisible = false;
  @Input() courseId: number | null = null;
  @Input() courseName = '';
  @Input() canWriteReview = false; // Whether user can write review (enrolled students)
  
  // Course information for display
  @Input() courseInfo: any = null; // Contains course details like price, description, thumbnail, etc.
  @Input() userLoggedIn = false;
  @Input() isEnrolled = false;
  
  @Output() closeModal = new EventEmitter<void>();
  @Output() enrollCourse = new EventEmitter<number>();

  reviews: CourseReview[] = [];
  loading = false;
  error: string | null = null;
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 5;
  totalPages = 1;
  
  // Rating breakdown
  averageRating = 0;
  ratingBreakdown: { stars: number; count: number; percentage: number }[] = [];
  
  // Login confirmation modal
  showLoginConfirmModal = false;

  constructor(
    private courseReviewService: CourseReviewService,
    private sessionService: SessionService,
    private router: Router,
    private notificationService: NotificationService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (this.courseId && this.isVisible) {
      this.loadReviews();
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isVisible'] && this.isVisible && this.courseId) {
      this.loadReviews();
    }
    
    if (changes['courseId'] && this.courseId) {
      this.currentPage = 1;
      this.loadReviews();
    }
  }

  loadReviews() {
    if (!this.courseId) return;
    
    this.loading = true;
    this.error = null;

    // Check if user is logged in by checking current user
    const currentUser = this.sessionService.getCurrentUser();
    const isLoggedIn = !!currentUser;
    
    const reviewsObservable = isLoggedIn 
      ? this.courseReviewService.getReviewsByCourse(this.courseId)
      : this.courseReviewService.getPublicReviewsByCourse(this.courseId);

    reviewsObservable.subscribe({
      next: (reviews) => {
        this.reviews = reviews;
        this.calculateRatingStats();
        this.calculatePagination();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading reviews:', error);
        this.error = 'Không thể tải đánh giá. Vui lòng thử lại sau.';
        this.loading = false;
      }
    });
  }

  calculateRatingStats() {
    if (this.reviews.length === 0) {
      this.averageRating = 0;
      this.ratingBreakdown = [];
      return;
    }

    // Calculate average rating
    const sum = this.reviews.reduce((acc, review) => acc + review.rating, 0);
    this.averageRating = sum / this.reviews.length;

    // Calculate rating breakdown (5 stars to 1 star)
    this.ratingBreakdown = [];
    for (let stars = 5; stars >= 1; stars--) {
      const count = this.reviews.filter(review => review.rating === stars).length;
      const percentage = this.reviews.length > 0 ? (count / this.reviews.length) * 100 : 0;
      this.ratingBreakdown.push({ stars, count, percentage });
    }
  }

  calculatePagination() {
    this.totalPages = Math.ceil(this.reviews.length / this.itemsPerPage);
  }

  get paginatedReviews(): CourseReview[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    return this.reviews.slice(startIndex, endIndex);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  getStarArray(rating: number): boolean[] {
    return Array(5).fill(0).map((_, index) => index < Math.floor(rating));
  }

  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    if (isPlatformBrowser(this.platformId)) {
      try {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });
      } catch (error) {
        return dateString;
      }
    }
    return dateString;
  }

  formatPrice(price: number): string {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND'
    }).format(price);
  }

  getCourseImageUrl(thumbnailUrl: string | undefined): string {
    if (!thumbnailUrl) {
      return 'assets/default-course.png';
    }
    return thumbnailUrl;
  }

  getAvatarUrl(avatarUrl: string | undefined): string {
    if (!avatarUrl) {
      return 'https://res.cloudinary.com/dyci7zxpk/image/upload/v1755231878/avt-macdinh_yrecgv.jpg';
    }
    
    if (avatarUrl.startsWith('http')) {
      return avatarUrl;
    }
    
    return `https://lms-backend001-110ad185d2b7.herokuapp.com/files/images/${avatarUrl}`;
  }

  onImageError(event: any) {
    event.target.src = 'assets/default-course.png';
  }

  onAvatarError(event: any) {
    event.target.src = 'https://res.cloudinary.com/dyci7zxpk/image/upload/v1755231878/avt-macdinh_yrecgv.jpg';
  }

  onEnrollCourse() {
    if (this.courseId) {
      this.enrollCourse.emit(this.courseId);
    }
  }

  onPurchaseClick() {
    // Hiển thị modal xác nhận thay vì chuyển hướng ngay
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
    this.onClose();
    this.router.navigate(['/login']);
  }

  goToRegister() {
    this.notificationService.show({
      type: 'info', 
      title: 'Chuyển hướng',
      message: 'Đang chuyển đến trang đăng ký...'
    });
    this.closeLoginConfirmModal();
    this.onClose();
    this.router.navigate(['/signup']);
  }

  navigateToWriteReview() {
    this.onClose();
    this.router.navigate(['/course-review'], {
      queryParams: {
        courseId: this.courseId,
        courseName: this.courseName,
        mode: 'write'
      }
    });
  }

  onClose() {
    this.closeModal.emit();
  }
}
