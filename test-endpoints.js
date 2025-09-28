// Simple test script to verify endpoints are working
const fetch = require('node-fetch');

const API_URL = 'http://localhost:5000';

async function testEndpoints() {
    console.log('Testing AKWANDA.rw endpoints...\n');

    try {
        // Test health endpoint
        console.log('1. Testing health endpoint...');
        const healthRes = await fetch(`${API_URL}/health`);
        const healthData = await healthRes.json();
        console.log('✅ Health check:', healthData.status);

        // Test metrics endpoint
        console.log('\n2. Testing metrics endpoint...');
        const metricsRes = await fetch(`${API_URL}/api/metrics/landing`);
        const metricsData = await metricsRes.json();
        console.log('✅ Metrics:', metricsData.metrics);

        // Test properties endpoint
        console.log('\n3. Testing properties endpoint...');
        const propertiesRes = await fetch(`${API_URL}/api/properties`);
        const propertiesData = await propertiesRes.json();
        console.log('✅ Properties endpoint working, found', propertiesData.properties?.length || 0, 'properties');

        console.log('\n🎉 All basic endpoints are working!');
        console.log('\nNote: Image upload, payment, and billing endpoints require authentication.');
        console.log('You can test these through the frontend interface.');

    } catch (error) {
        console.error('❌ Error testing endpoints:', error.message);
        console.log('\nMake sure the backend server is running on port 5000');
    }
}

testEndpoints();
