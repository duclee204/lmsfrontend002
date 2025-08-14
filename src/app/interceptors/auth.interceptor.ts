import { HttpInterceptorFn } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const AuthInterceptor: HttpInterceptorFn = (req, next) => {
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  
  console.log('🔍 Auth Interceptor - Request URL:', req.url);
  
  // Skip auth for login/register endpoints
  if (req.url.includes('/users/login') || req.url.includes('/users/register')) {
    console.log('⏭️ Skipping auth for login/register endpoint');
    return next(req);
  }

  // Add token only in browser environment
  if (isBrowser) {
    const token = localStorage.getItem('token');
    console.log('🔍 Auth Interceptor - Token exists:', !!token);
    
    if (token) {
      console.log('🔍 Auth Interceptor - Token preview:', token.substring(0, 50) + '...');
      
      const authReq = req.clone({
        headers: req.headers.set('Authorization', `Bearer ${token}`)
      });
      
      console.log('✅ Auth Interceptor - Added Authorization header');
      return next(authReq);
    } else {
      console.log('❌ Auth Interceptor - No token found in localStorage');
    }
  } else {
    console.log('❌ Auth Interceptor - Not in browser environment');
  }

  console.log('❌ Auth Interceptor - Proceeding without auth header');
  return next(req);
};
