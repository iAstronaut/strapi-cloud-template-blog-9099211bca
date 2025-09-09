// File: src/api/cobalt-auth/services/cobalt-auth.js

'use strict';

const bcrypt = require('bcryptjs');

/**
 * Cobalt Auth Service
 */

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::cobalt-auth.cobalt-auth', ({ strapi }) => ({

  /**
   * Decode Cobalt JWT token
   */
  decodeCobaltToken(token) {
    try {
      if (!token) return null;
      
      const [, payloadB64] = token.split('.');
      if (!payloadB64) return null;
      
      const base64 = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
      const jsonStr = Buffer.from(base64, 'base64').toString('utf8');
      return JSON.parse(jsonStr);
    } catch (error) {
      console.error('Error decoding Cobalt token:', error);
      return null;
    }
  },

  /**
   * Check if user has CMS permissions in Cobalt token
   */
  hasCMSPermission(cobaltPayload) {
    if (!cobaltPayload) return false;

    const roles = cobaltPayload?.roles || cobaltPayload?.role || cobaltPayload?.authorities || [];
    const roleNames = Array.isArray(roles)
      ? roles.map((r) => (typeof r === 'string' ? r : r?.name || r?.code)).filter(Boolean)
      : [roles].filter(Boolean);
    
    const scope = cobaltPayload?.scope || cobaltPayload?.permissions || [];
    const scopeList = Array.isArray(scope) ? scope : typeof scope === 'string' ? scope.split(' ') : [];
    
    return (
      roleNames.some((n) => String(n).toLowerCase().includes('cms') || String(n).toLowerCase().includes('admin')) ||
      scopeList.some((s) => String(s).toLowerCase().includes('cms') || String(s).toLowerCase().includes('admin')) ||
      String((cobaltPayload?.isCMS ?? cobaltPayload?.isCms ?? cobaltPayload?.is_cms) || '').toLowerCase() === 'true'
    );
  },

  /**
   * Find or create Strapi admin user from Cobalt token
   */
  async findOrCreateAdminUser(email, cobaltPayload) {
    try {
      // Find existing user
      let adminUser = await strapi.query('admin::user').findOne({
        where: { email: email.toLowerCase() },
        populate: ['roles']
      });

      // If user exists, return it
      if (adminUser) {
        return { user: adminUser, created: false };
      }

      // Create new user if Cobalt payload is valid and has CMS permission
      if (!cobaltPayload || !this.hasCMSPermission(cobaltPayload)) {
        throw new Error('No CMS permission in Cobalt token');
      }

      // Get default admin role
      const adminRole = await strapi.query('admin::role').findOne({
        where: { code: 'strapi-super-admin' }
      });

      if (!adminRole) {
        // Try to find any admin role
        const anyAdminRole = await strapi.query('admin::role').findOne({
          where: { name: { $contains: 'Admin' } }
        });
        
        if (!anyAdminRole) {
          throw new Error('No admin role found in Strapi');
        }
        adminRole = anyAdminRole;
      }

      // Generate a secure temporary password
      const tempPassword = 'cobalt_' + Math.random().toString(36).substring(2, 15) + Date.now();

      // Create admin user
      adminUser = await strapi.query('admin::user').create({
        data: {
          email: email.toLowerCase(),
          firstname: cobaltPayload.firstname || cobaltPayload.name || cobaltPayload.given_name || 'Cobalt',
          lastname: cobaltPayload.lastname || cobaltPayload.family_name || 'User',
          username: cobaltPayload.username || cobaltPayload.preferred_username || email.split('@')[0],
          password: await bcrypt.hash(tempPassword, 12),
          isActive: true,
          registrationToken: null,
          roles: [adminRole.id]
        },
        populate: ['roles']
      });

      console.log('[CMS Service] Created admin user:', {
        id: adminUser.id,
        email: adminUser.email,
        username: adminUser.username
      });

      // Optionally log the creation in cobalt-auth collection
      try {
        await strapi.entityService.create('api::cobalt-auth.cobalt-auth', {
          data: {
            cobaltUserId: cobaltPayload.sub || cobaltPayload.id || cobaltPayload.user_id,
            cobaltUsername: cobaltPayload.username || cobaltPayload.preferred_username,
            strapiAdminUser: adminUser.id,
            lastLogin: new Date(),
            loginCount: 1
          }
        });
      } catch (logError) {
        // Don't fail if logging fails
        console.warn('[CMS Service] Failed to log user creation:', logError);
      }

      return { user: adminUser, created: true };

    } catch (error) {
      console.error('[CMS Service] Error in findOrCreateAdminUser:', error);
      throw error;
    }
  },

  /**
   * Generate Strapi JWT for admin user
   */
  generateAdminJWT(adminUser) {
    try {
      return strapi.admin.services.token.createJwtToken({
        id: adminUser.id
      });
    } catch (error) {
      console.error('[CMS Service] Error generating JWT:', error);
      throw error;
    }
  },

  /**
   * Set authentication cookie
   */
  setAuthCookie(ctx, jwtToken) {
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      sameSite: 'lax',
      domain: process.env.NODE_ENV === 'production' ? undefined : 'localhost'
    };

    ctx.cookies.set('strapi-jwt', jwtToken, cookieOptions);

    // Also set session if available
    if (ctx.session) {
      ctx.session.strapiToken = jwtToken;
      ctx.session.userId = this.decodeJwtToken(jwtToken)?.id;
    }
  },

  /**
   * Handle token auto-login (used by middleware)
   */
  async handleTokenAutoLogin(email, cobaltToken) {
    try {
      console.log('[CMS Service] Handling token auto-login for:', email);

      // Decode and validate Cobalt token
      const cobaltPayload = this.decodeCobaltToken(cobaltToken);

      if (!cobaltPayload) {
        return { success: false, error: 'Invalid Cobalt token' };
      }

      // Check CMS permissions
      const hasCMSAccess = this.hasCMSPermission(cobaltPayload);
      if (!hasCMSAccess) {
        return { success: false, error: 'User does not have CMS permissions' };
      }

      // Find or create admin user
      const { user: adminUser } = await this.findOrCreateAdminUser(email, cobaltPayload);

      // Check if user is active
      if (!adminUser.isActive) {
        return { success: false, error: 'User account is disabled' };
      }

      // Generate JWT token for Strapi admin
      const jwtToken = this.generateAdminJWT(adminUser);

      // Update login statistics
      await this.updateLoginStats(cobaltPayload);

      console.log('[CMS Service] Token auto-login successful for:', email);

      return {
        success: true,
        jwtToken: jwtToken,
        user: {
          id: adminUser.id,
          email: adminUser.email,
          firstname: adminUser.firstname,
          lastname: adminUser.lastname,
          username: adminUser.username
        }
      };

    } catch (error) {
      console.error('[CMS Service] Token auto-login error:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Update login statistics
   */
  async updateLoginStats(cobaltPayload) {
    try {
      if (!cobaltPayload?.sub && !cobaltPayload?.id && !cobaltPayload?.user_id) {
        return; // No user ID to track
      }

      const cobaltUserId = cobaltPayload.sub || cobaltPayload.id || cobaltPayload.user_id;
      
      const existingRecord = await strapi.entityService.findMany('api::cobalt-auth.cobalt-auth', {
        filters: { cobaltUserId: cobaltUserId }
      });

      if (existingRecord.length > 0) {
        // Update existing record
        await strapi.entityService.update('api::cobalt-auth.cobalt-auth', existingRecord[0].id, {
          data: {
            lastLogin: new Date(),
            loginCount: (existingRecord[0].loginCount || 0) + 1
          }
        });
      }
    } catch (error) {
      console.warn('[CMS Service] Failed to update login stats:', error);
    }
  }

}));