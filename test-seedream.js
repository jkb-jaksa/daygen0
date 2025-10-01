#!/usr/bin/env node

/**
 * Test script for Seedream 4.0 API integration
 * Run with: node test-seedream.js
 */

const API_BASE_URL = 'http://localhost:3000';

async function testSeedreamAPI() {
  console.log('🧪 Testing Seedream 4.0 API integration...\n');

  // Test data
  const testData = {
    prompt: 'A beautiful sunset over a mountain landscape',
    model: 'seedream-4.0',
    providerOptions: {
      size: '1024x1024',
      n: 1
    }
  };

  try {
    console.log('📤 Sending request to /api/image/seedream...');
    console.log('Request data:', JSON.stringify(testData, null, 2));

    const response = await fetch(`${API_BASE_URL}/api/image/seedream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: In a real test, you'd need a valid auth token
        // 'Authorization': 'Bearer YOUR_TOKEN_HERE'
      },
      body: JSON.stringify(testData)
    });

    console.log(`\n📥 Response status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('❌ Error response:', errorText);
      
      if (response.status === 500) {
        console.log('\n🔍 Possible issues:');
        console.log('1. ARK_API_KEY environment variable not set');
        console.log('2. Seedream API endpoint incorrect');
        console.log('3. API key invalid or expired');
        console.log('4. Network connectivity issues');
      }
      
      return;
    }

    const result = await response.json();
    console.log('✅ Success! Response:', JSON.stringify(result, null, 2));

    if (result.images && Array.isArray(result.images)) {
      console.log(`\n🎨 Generated ${result.images.length} image(s)`);
      result.images.forEach((img, index) => {
        if (img.startsWith('data:')) {
          console.log(`Image ${index + 1}: Base64 data URL (${img.length} characters)`);
        } else {
          console.log(`Image ${index + 1}: ${img}`);
        }
      });
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('\n🔍 Make sure the server is running:');
      console.log('1. Start the server: npm run dev');
      console.log('2. Check if it\'s running on port 3000');
    }
  }
}

// Check if server is running first
async function checkServer() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/health`);
    if (response.ok) {
      console.log('✅ Server is running');
      return true;
    }
  } catch (error) {
    console.log('❌ Server is not running or not accessible');
    console.log('Please start the server with: npm run dev');
    return false;
  }
}

async function main() {
  console.log('🚀 Seedream 4.0 API Test\n');
  
  const serverRunning = await checkServer();
  if (!serverRunning) {
    process.exit(1);
  }
  
  await testSeedreamAPI();
}

main().catch(console.error);
