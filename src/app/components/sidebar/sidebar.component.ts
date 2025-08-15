import { Component, OnInit, HostListener, ElementRef } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SessionService } from '../../services/session.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss']
})
export class SidebarComponent implements OnInit {
  
  currentRoute: string = '';
  isExpanded: boolean = false;
  sidebarExpanded: boolean = false;

  constructor(
    private router: Router,
    private sessionService: SessionService,
    private elementRef: ElementRef
  ) {}

  // Check if current user is student
  isStudent(): boolean {
    return this.sessionService.isStudent();
  }

  ngOnInit() {
    // Lắng nghe sự thay đổi route để cập nhật active state
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      this.currentRoute = event.url;
    });

    // Set initial route
    this.currentRoute = this.router.url;
  }

  @HostListener('mouseenter')
  onMouseEnter() {
    if (window.innerWidth > 768) {
      this.isExpanded = true;
    }
  }

  @HostListener('mouseleave') 
  onMouseLeave() {
    if (window.innerWidth > 768) {
      this.isExpanded = false;
    }
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    // Chỉ áp dụng trên mobile
    if (window.innerWidth <= 768 && this.sidebarExpanded) {
      const target = event.target as Element;
      // Nếu click bên ngoài sidebar, ẩn sidebar
      if (!this.elementRef.nativeElement.contains(target)) {
        this.sidebarExpanded = false;
      }
    }
  }

  navigateTo(route: string, event?: Event) {
    if (event && window.innerWidth <= 768 && !this.sidebarExpanded) {
      // On mobile, first click expands sidebar
      event.preventDefault();
      event.stopPropagation();
      this.sidebarExpanded = true;
      return;
    }
    
    this.router.navigate([route]);
    
    // Reset sidebar state after navigation on mobile
    if (window.innerWidth <= 768) {
      this.sidebarExpanded = false;
    }
  }

  isActiveRoute(route: string): boolean {
    // Nếu là route courses, kiểm tra các trang liên quan đến khóa học
    if (route === '/courses') {
      const courseRelatedRoutes = [
        '/courses',
        '/course-home',
        '/discussion',
        '/grades',
        '/student-grades',
        '/module',
        '/video-upload',
        '/learn-online',
        '/exam',
        '/addexam',
        '/question-manager',
        '/take-exam'
      ];
      
      // Lấy path từ URL (bỏ query parameters)
      const currentPath = this.currentRoute.split('?')[0];
      
      return courseRelatedRoutes.some(courseRoute => 
        currentPath === courseRoute || currentPath.startsWith(courseRoute + '/')
      );
    }
    
    // Cho các route khác, sử dụng logic mặc định (cũng xử lý query parameters)
    const currentPath = this.currentRoute.split('?')[0];
    return currentPath === route || currentPath.startsWith(route + '/');
  }

  logout(event?: Event) {
    if (event && window.innerWidth <= 768 && !this.sidebarExpanded) {
      // On mobile, first click expands sidebar
      event.preventDefault();
      event.stopPropagation();
      this.sidebarExpanded = true;
      return;
    }
    
    // SessionService sẽ xử lý việc hiển thị notification và chuyển hướng
    this.sessionService.logout();
  }
}
