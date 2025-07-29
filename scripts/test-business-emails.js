// test-business-emails.js - Test script for business email functions
// Run this with: node test-business-emails.js

const { sendBusinessApplicationEmail, sendBusinessApprovalEmail } = require('../controllers/emailService');

// Test business data (similar to the data you provided)
const testBusinessData = {
  businessName: "Paradise Tours TC",
  businessType: "restaurant",
  businessAddress: {
    street: "123 Paradise Street",
    city: "Providenciales", 
    island: "South Caicos",
    postalCode: "TKCA 1ZZ"
  },
  businessPhone: "+1-649-555-0123",
  businessDescription: "Amazing local restaurant serving authentic Caribbean cuisine with stunning ocean views. We offer fresh seafood, traditional island dishes, and warm Caribbean hospitality.",
  businessWebsite: "https://paradisetours.tc",
  servicesOffered: ["dining", "activities"],
  documents: [
    { documentLabel: "Business License", fileType: "business-license" },
    { documentLabel: "Health Permit", fileType: "health-permit" }
  ]
};

// Test function for application confirmation email
async function testApplicationEmail() {
  console.log('🧪 Testing Business Application Email...\n');
  
  try {
    const result = await sendBusinessApplicationEmail(
      'emerymeghoo1967@gmail.com', // Replace with your email
      testBusinessData,
      'John Smith' // Owner name
    );
    
    if (result.success) {
      console.log('✅ Business Application Email sent successfully!');
      console.log('📧 Check your email inbox for the application confirmation');
    }
  } catch (error) {
    console.error('❌ Business Application Email failed:', error.message);
  }
}

// Test function for approval email
async function testApprovalEmail() {
  console.log('\n🧪 Testing Business Approval Email...\n');
  
  try {
    const result = await sendBusinessApprovalEmail(
      'emerymeghoo1967@gmail.com', // Replace with your email
      testBusinessData,
      'John Smith' // Owner name
    );
    
    if (result.success) {
      console.log('✅ Business Approval Email sent successfully!');
      console.log('📧 Check your email inbox for the approval notification');
    }
  } catch (error) {
    console.error('❌ Business Approval Email failed:', error.message);
  }
}

// Run both tests
async function runTests() {
  console.log('🚀 Starting Business Email Tests...\n');
  console.log('⚠️  Make sure to update the email address in this script first!\n');
  
  await testApplicationEmail();
  await testApprovalEmail();
  
  console.log('\n✨ Tests completed! Check your email inbox.\n');
}

// Uncomment the line below to run the tests
runTests();

console.log('📝 To test the business emails:');
console.log('1. Update the email addresses in this script');
console.log('2. Uncomment the runTests() line at the bottom');
console.log('3. Run: node test-business-emails.js');
console.log('4. Check your email inbox for both test emails\n');