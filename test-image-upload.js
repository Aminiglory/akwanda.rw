// Test script to verify image upload endpoint
const fetch = require('node-fetch');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:5000';

async function testImageUpload() {
    console.log('Testing image upload endpoint...\n');

    try {
        // First, test if the server is running
        console.log('1. Testing server health...');
        const healthRes = await fetch(`${API_URL}/health`);
        const healthData = await healthRes.json();
        console.log('✅ Server is running:', healthData.status);

        // Test the image upload endpoint
        console.log('\n2. Testing image upload endpoint...');
        
        // Create a simple test image (1x1 pixel PNG)
        const testImageBuffer = Buffer.from([
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
            0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
            0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
            0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x0F, 0x00, 0x00,
            0x01, 0x00, 0x01, 0x00, 0x18, 0xDD, 0x8D, 0xB4, 0x00, 0x00, 0x00, 0x00,
            0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
        ]);

        const formData = new FormData();
        formData.append('images', testImageBuffer, {
            filename: 'test.png',
            contentType: 'image/png'
        });

        const uploadRes = await fetch(`${API_URL}/api/properties/upload/images`, {
            method: 'POST',
            body: formData,
            headers: {
                'Cookie': 'akw_token=test-token' // This will fail auth, but we can see the response
            }
        });

        console.log('Upload response status:', uploadRes.status);
        console.log('Upload response headers:', Object.fromEntries(uploadRes.headers.entries()));

        const responseText = await uploadRes.text();
        console.log('Response content type:', uploadRes.headers.get('content-type'));
        console.log('Response length:', responseText.length);
        console.log('Response preview:', responseText.substring(0, 200));

        if (uploadRes.headers.get('content-type')?.includes('application/json')) {
            const data = JSON.parse(responseText);
            console.log('✅ Endpoint returns JSON:', data);
        } else {
            console.log('❌ Endpoint returns HTML instead of JSON');
            console.log('This indicates the server is not running or there\'s a routing issue');
        }

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        
        if (error.code === 'ECONNREFUSED') {
            console.log('\n💡 Solution: Make sure the backend server is running:');
            console.log('   cd backend && npm start');
        }
    }
}

testImageUpload();
