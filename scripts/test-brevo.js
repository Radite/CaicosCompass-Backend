// Test script to verify Brevo API key is working
// Save this as test-brevo.js and run with: node test-brevo.js

const axios = require('axios');

// Test function to register a user and trigger verification email
async function testBrevoIntegration() {
    try {
        console.log('🧪 Testing Brevo API integration...\n');

        // Test user data
        const testUser = {
            name: "Test User",
            email: "joshuameghoo4@gmail.com", // Replace with your actual email
            password: "TestPassword123",
            role: "user"
        };

        console.log(`📧 Sending registration request for: ${testUser.email}`);

        // Send registration request to your backend
        const response = await axios.post('http://localhost:5000/api/users/register', testUser);

        if (response.status === 201) {
            console.log('✅ Registration successful!');
            console.log('📨 Response:', response.data.message);
            console.log('\n🔍 Check your email inbox for the verification email');
            console.log('📧 Email should arrive within 1-2 minutes');
        }

    } catch (error) {
        console.error('❌ Test failed!');
        
        if (error.response) {
            console.log('📊 Status:', error.response.status);
            console.log('📝 Error:', error.response.data.message);
            
            if (error.response.data.message?.includes('User already exists')) {
                console.log('\n💡 Try using a different email address');
            }
            
            if (error.response.data.message?.includes('email')) {
                console.log('\n🔧 This might be a Brevo API key issue. Check:');
                console.log('   1. API key is correct in .env file');
                console.log('   2. Sender email is verified in Brevo dashboard');
                console.log('   3. Server was restarted after updating .env');
            }
        } else {
            console.log('🔌 Connection error:', error.message);
            console.log('💡 Make sure your server is running on http://localhost:5000');
        }
    }
}

// Run the test
testBrevoIntegration();

// Additional direct Brevo API test
async function testBrevoDirectly() {
    const SibApiV3Sdk = require('sib-api-v3-sdk');
    require('dotenv').config();

    try {
        console.log('\n🔧 Testing Brevo API directly...');
        
        SibApiV3Sdk.ApiClient.instance.authentications['api-key'].apiKey = process.env.BREVO_API_KEY;
        const emailApi = new SibApiV3Sdk.TransactionalEmailsApi();

        // Test email
        const mailOptions = {
            sender: {
                email: process.env.BREVO_SENDER_EMAIL,
                name: "CaicosCompass Test"
            },
            to: [{
                email: "your-test-email@gmail.com" // Replace with your email
            }],
            subject: '🧪 Brevo API Test - Success!',
            htmlContent: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>✅ Brevo Integration Test Successful!</h2>
                    <p>Your new API key is working correctly.</p>
                    <p>Time: ${new Date().toLocaleString()}</p>
                </div>
            `
        };

        await emailApi.sendTransacEmail(mailOptions);
        console.log('✅ Direct Brevo API test successful!');
        console.log('📧 Check your email for the test message');

    } catch (error) {
        console.error('❌ Direct Brevo API test failed:');
        console.error('Error:', error.body || error.message);
        
        if (error.body?.code === 'unauthorized') {
            console.log('\n🔑 API Key issue detected!');
            console.log('📝 Please check:');
            console.log('   1. Copy the full API key from Brevo dashboard');
            console.log('   2. Make sure it starts with "xkeysib-"');
            console.log('   3. No extra spaces or characters');
        }
    }
}

// Uncomment to test Brevo directly
// testBrevoDirectly();