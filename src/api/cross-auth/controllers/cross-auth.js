'use strict';

const Buffer = require('buffer').Buffer;

module.exports = {
  // Xử lý redirect từ Blog React với JWT token
  async handleCrossAuth(ctx) {
    try {
      const { token } = ctx.query;
      
      if (!token) {
        return ctx.badRequest('JWT token is required');
      }
      
      console.log('[CMS] Received JWT token, decoding...');
      
      try {
        // Decode JWT token để lấy thông tin user
        const decoded = strapi.plugins['users-permissions'].services.jwt.verify(token);
        
        if (!decoded) {
          console.log('[CMS] JWT verification failed, trying admin token...');
          // Thử với admin token
          const adminDecoded = strapi.admin.services.token.verify(token);
          if (adminDecoded) {
            // Nếu là admin token, redirect trực tiếp
            console.log('[CMS] Admin token valid, redirecting to /admin');
            ctx.redirect('/admin');
            return;
          }
          return ctx.unauthorized('Invalid JWT token');
        }
        
        console.log('[CMS] JWT decoded successfully:', { id: decoded.id, email: decoded.email });
        
        // Lấy user từ database
        const user = await strapi.plugins['users-permissions'].services.user.fetch(decoded.id);
        
        if (!user) {
          return ctx.unauthorized('User not found');
        }
        
        // Kiểm tra role có phải CMS không
        if (user.role.type === 'admin' || user.role.name === 'cms') {
          console.log('[CMS] User has CMS role, attempting admin login...');
          
          try {
            // Gọi trực tiếp Strapi admin login API với thông tin từ JWT
            const loginResponse = await strapi.admin.services.auth.validate({
              email: user.email,
              password: decoded.password || user.password // Lấy password từ JWT hoặc user
            });
            
            if (loginResponse && loginResponse.user) {
              console.log('[CMS] Admin login successful for user:', loginResponse.user.email);
              
              // Tạo admin token
              const adminToken = strapi.admin.services.token.create({
                id: loginResponse.user.id,
                email: loginResponse.user.email,
                username: loginResponse.user.username,
                firstname: loginResponse.user.firstname,
                lastname: loginResponse.user.lastname,
                roles: loginResponse.user.roles || []
              });

              // Set cookie và redirect
              ctx.cookies.set('strapi_admin_token', adminToken, {
                httpOnly: true,
                secure: false, // Set to true in production with HTTPS
                sameSite: 'lax',
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
              });

              console.log('[CMS] Admin session created, redirecting to /admin');
              // Redirect đến admin panel
              ctx.redirect('/admin');
            } else {
              console.log('[CMS] Admin login failed - invalid response');
              return ctx.unauthorized('Invalid credentials');
            }
            
          } catch (loginError) {
            console.error('[CMS] Admin login error:', loginError);
            return ctx.unauthorized('Invalid email or password');
          }
          
        } else {
          return ctx.forbidden('Access denied. CMS role required.');
        }
        
      } catch (jwtError) {
        console.error('[CMS] JWT decode error:', jwtError);
        return ctx.unauthorized('Invalid JWT token');
      }
      
    } catch (error) {
      console.error('Cross-auth error:', error);
      return ctx.internalServerError('Authentication failed');
    }
  },

  // Validate token từ external app
  async validateToken(ctx) {
    try {
      const { token } = ctx.request.body;
      
      if (!token) {
        return ctx.badRequest('Token is required');
      }
      
      // Xác thực JWT token
      const decoded = strapi.plugins['users-permissions'].services.jwt.verify(token);
      
      if (!decoded) {
        return ctx.unauthorized('Invalid token');
      }
      
      // Lấy user từ token
      const user = await strapi.plugins['users-permissions'].services.user.fetch(decoded.id);
      
      if (!user) {
        return ctx.unauthorized('User not found');
      }
      
      return {
        valid: true,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          isCMS: user.role.type === 'admin' || user.role.name === 'cms'
        }
      };
    } catch (error) {
      console.error('Token validation error:', error);
      return ctx.internalServerError('Token validation failed');
    }
  }
};
