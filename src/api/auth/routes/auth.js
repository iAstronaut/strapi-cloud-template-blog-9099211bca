// File: src/api/cobalt-auth/routes/cobalt-auth.js

'use strict';

/**
 * cobalt-auth router
 */

module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/cobalt-auth/auto-login',
      handler: 'cobalt-auth.autoLogin',
      config: {
        auth: false, // Không cần authentication
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/cobalt-auth/check-auth',
      handler: 'cobalt-auth.checkAuth',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    }
  ],
};