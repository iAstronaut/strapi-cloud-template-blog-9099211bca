// File: src/api/auth/controllers/auth.js

'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

/**
 * Auth Controller
 */

const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::auth.auth', ({ strapi }) => ({

  /**
   * Auto-login endpoint for Cobalt integration
   */
  async autoLogin(ctx) {
    try {
      const { email, cobaltToken, password } = ctx.request.body;

      // Validate input
      if (!email) {
        return ctx.badRequest('Email is required');
      }

      if (!cobaltToken) {
        return ctx.badRequest('Cobalt token is required');
      }

      // Decode and validate Cobalt token
      const cobaltPayload = strapi.service('api::auth.auth').decodeCobaltToken(cobaltToken);

      if (!cobaltPayload) {
        return ctx.unauthorized('Invalid Cobalt token');
      }

      // Check CMS permissions
      const hasCMSAccess = strapi.service('api::auth.auth').hasCMSPermission(cobaltPayload);
      if (!hasCMSAccess) {
        return ctx.forbidden('User does not have CMS permissions');
      }

      // Find or create admin user
      const { user: adminUser, created } = await strapi.service('api::auth.auth')
        .findOrCreateAdminUser(email, cobaltPayload, password);

      // Check if user is active
      if (!adminUser.isActive) {
        return ctx.unauthorized('User account is disabled');
      }

      // Generate JWT token for Strapi admin
      const jwtToken = strapi.admin.services.token.createJwtToken({
        id: adminUser.id
      });

      // Set authentication cookie
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        sameSite: 'lax'
      };

      ctx.cookies.set('strapi-jwt', jwtToken, cookieOptions);

      // Also set session if needed
      if (ctx.session) {
        ctx.session.strapiToken = jwtToken;
        ctx.session.userId = adminUser.id;
      }

      // Update login statistics
      await strapi.service('api::auth.auth').updateLoginStats(cobaltPayload);

      console.log(`[Auth Controller] Auto-login successful for ${email} (${created ? 'created' : 'existing'} user)`);

      // Return success response
      ctx.send({
        success: true,
        message: created ? 'User created and logged in successfully' : 'Auto-login successful',
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstname: adminUser.firstname,
          lastname: adminUser.lastname,
          username: adminUser.username,
          created: created
        }
      });

    } catch (error) {
      console.error('[Auth Controller] Auto-login error:', error);
      ctx.internalServerError(`Auto-login failed: ${error.message}`);
    }
  },

  /**
   * Check authentication status
   */
  async checkAuth(ctx) {
    try {
      const token = ctx.cookies.get('strapi-jwt') || ctx.session?.strapiToken;

      if (!token) {
        return ctx.send({ authenticated: false });
      }

      // Verify token
      const decoded = strapi.admin.services.token.decodeJwtToken(token);
      const user = await strapi.query('admin::user').findOne({
        where: { id: decoded.id },
        select: ['id', 'email', 'firstname', 'lastname', 'isActive']
      });

      if (!user || !user.isActive) {
        return ctx.send({ authenticated: false });
      }

      ctx.send({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          firstname: user.firstname,
          lastname: user.lastname
        }
      });

    } catch (error) {
      console.error('Check auth error:', error);
      ctx.send({ authenticated: false });
    }
  }

}));