// File: src/middlewares/auto-login.js

'use strict';

module.exports = {
  name: 'auto-login',
  register: () => {
    return async (ctx, next) => {
      console.log('[Auto-Login Middleware] Loading...');
      await next();
    };
  }
};
