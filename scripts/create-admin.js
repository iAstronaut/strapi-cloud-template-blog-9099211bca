'use strict';

/**
 * Script to create admin user for cobalt-cms
 * Run this script to create an admin user that can be used for auto-login
 */

const bcrypt = require('bcryptjs');

module.exports = async ({ strapi }) => {
  try {
    console.log('Creating admin user for cobalt-cms...');

    // Check if admin user already exists
    const existingUser = await strapi.query('admin::user').findOne({
      where: { email: 'jlat-cobalt-dev@example.com' }
    });

    if (existingUser) {
      console.log('Admin user already exists:', existingUser.email);
      return;
    }

    // Create admin user
    const adminUser = await strapi.query('admin::user').create({
      data: {
        firstname: 'JAL',
        lastname: 'Cobalt Dev',
        email: 'jlat-cobalt-dev@example.com',
        username: 'jlat-cobalt-dev',
        password: 'Cobalt123!', // Change this password
        isActive: true,
        blocked: false,
        preferedLanguage: 'en'
      }
    });

    console.log('Admin user created successfully:', {
      id: adminUser.id,
      email: adminUser.email,
      username: adminUser.username
    });

    console.log('You can now use this account for auto-login from JAL webclient');
    console.log('Email: jlat-cobalt-dev@example.com');
    console.log('Password: Cobalt123!');

  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};