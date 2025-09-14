// Simple test script to verify the API integration
const testAPI = async () => {
  try {
    console.log('Testing API integration...');
    
    const response = await fetch('http://localhost:5173/api/generate-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: 'A simple test image of a banana',
      }),
    });

    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('API Error:', error);
      return;
    }

    const data = await response.json();
    console.log('API Response:', {
      hasImageBase64: !!data.imageBase64,
      mimeType: data.mimeType,
      imageSize: data.imageBase64 ? data.imageBase64.length : 0
    });
    
    console.log('✅ API integration test completed successfully!');
  } catch (error) {
    console.error('❌ API test failed:', error.message);
  }
};

// Run the test
testAPI();
