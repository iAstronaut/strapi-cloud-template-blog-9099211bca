'use strict';

/**
 * Setup admin user for cobalt-cms
 * This script creates an admin user that can be used for testing
 */

module.exports = async ({ strapi }) => {
  try {
    console.log('Setting up admin user for cobalt-cms...');

    // Check if admin user already exists
    const existingUser = await strapi.query('admin::user').findOne({
      where: { email: 'jlat-cobalt-dev@example.com' }
    });

    if (existingUser) {
      console.log('Admin user already exists:', existingUser.email);
      console.log('You can login with:');
      console.log('Email: jlat-cobalt-dev@example.com');
      console.log('Password: Cobalt123!');
      return;
    }

    // Create admin user
    const adminUser = await strapi.query('admin::user').create({
      data: {
        firstname: 'JAL',
        lastname: 'Cobalt Dev',
        email: 'jlat-cobalt-dev@example.com',
        username: 'jlat-cobalt-dev',
        password: 'Cobalt123!',
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

    console.log('\n✅ Setup completed!');
    console.log('You can now login to Cobalt CMS with:');
    console.log('Email: jlat-cobalt-dev@example.com');
    console.log('Password: Cobalt123!');
    console.log('\nFor auto-login from JAL Webclient, use the standard Strapi admin login endpoint.');

  } catch (error) {
    console.error('Error setting up admin user:', error);
  }
};
