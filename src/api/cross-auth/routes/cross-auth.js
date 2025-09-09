'use strict';

module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/admin/auth/login',
      handler: 'cross-auth.handleCrossAuth',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/cms-auth/login',
      handler: 'cross-auth.handleCrossAuth',
      config: {
        auth: false,
      },
    },
    {
      method: 'GET',
      path: '/cross-auth',
      handler: 'cross-auth.handleCrossAuth',
      config: {
        auth: false
      }
    },
    {
      method: 'POST',
      path: '/cross-auth/validate',
      handler: 'cross-auth.validateToken',
      config: {
        auth: false
      }
    }
  ]
};





