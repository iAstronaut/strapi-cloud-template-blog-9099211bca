'use strict';

/**
 * Bootstrap function to run when cobalt-cms starts
 */

module.exports = async ({ strapi }) => {
  try {
    console.log('Cobalt CMS bootstrap started...');

    // Import and run the setup admin script
    const setupAdminScript = require('../../scripts/setup-admin');
    await setupAdminScript({ strapi });

    console.log('Cobalt CMS bootstrap completed');
  } catch (error) {
    console.error('Cobalt CMS bootstrap error:', error);
  }
};