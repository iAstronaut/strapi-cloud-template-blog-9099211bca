'use strict';

/**
 * Test script for cobalt-cms auto-login functionality
 * Run this script to test if the auto-login API is working
 */

const axios = require('axios');

async function testAutoLogin() {
  try {
    console.log('Testing Cobalt CMS auto-login...');

    // Test data
    const testData = {
      cobaltToken: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE3MzU2ODAwMDB9.test_signature',
      email: 'jlat-cobalt-dev@example.com'
    };

    // Test POST request
    console.log('\n1. Testing POST /api/cobalt-auth/auto-login...');
    try {
      const postResponse = await axios.post('http://localhost:1337/api/cobalt-auth/auto-login', testData, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      console.log('✅ POST request successful:', postResponse.status);
      console.log('Response:', postResponse.data);
    } catch (error) {
      console.log('❌ POST request failed:', error.response?.status, error.response?.data);
    }

    // Test GET request
    console.log('\n2. Testing GET /api/cobalt-auth/auto-login...');
    try {
      const getResponse = await axios.get('http://localhost:1337/api/cobalt-auth/auto-login', {
        params: {
          token: testData.cobaltToken,
          email: testData.email
        },
        withCredentials: true
      });
      console.log('✅ GET request successful:', getResponse.status);
      console.log('Response:', getResponse.data);
    } catch (error) {
      console.log('❌ GET request failed:', error.response?.status, error.response?.data);
    }

    // Test with invalid token
    console.log('\n3. Testing with invalid token...');
    try {
      const invalidResponse = await axios.post('http://localhost:1337/api/cobalt-auth/auto-login', {
        cobaltToken: 'invalid_token',
        email: 'jlat-cobalt-dev@example.com'
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        withCredentials: true
      });
      console.log('✅ Invalid token test successful:', invalidResponse.status);
    } catch (error) {
      console.log('❌ Invalid token test failed (expected):', error.response?.status, error.response?.data);
    }

    console.log('\n✅ Auto-login test completed!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testAutoLogin();
}

module.exports = testAutoLogin;