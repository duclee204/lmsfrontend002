import { inject, PLATFORM_ID } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';

export const homeRedirectGuard: CanActivateFn = (route, state) => {
  const platformId = inject(PLATFORM_ID);
  const router = inject(Router);

  if (isPlatformBrowser(platformId)) {
    const token = localStorage.getItem('token');
    
    if (token) {
      try {
        // Kiểm tra token có hợp lệ và chưa hết hạn
        const payload = JSON.parse(atob(token.split('.')[1]));
        const currentTime = Math.floor(Date.now() / 1000);
        
        if (payload.exp > currentTime) {
          // User đã đăng nhập và token còn hạn, redirect to /courses
          console.log('🔄 Logged in user detected, redirecting to courses');
          router.navigate(['/courses']);
          return false; // Prevent navigation to root, redirect instead
        } else {
          // Token hết hạn, xóa token và cho phép truy cập trang guest
          console.log('⏰ Token expired, allowing guest access');
          localStorage.removeItem('token');
          return true;
        }
      } catch (error) {
        // Token không hợp lệ, xóa token và cho phép truy cập trang guest
        console.error('❌ Invalid token format');
        localStorage.removeItem('token');
        return true;
      }
    }
    
    // Không có token, cho phép truy cập trang guest
    return true;
  }
  
  // Nếu không phải browser (SSR), cho phép truy cập
  return true;
};
