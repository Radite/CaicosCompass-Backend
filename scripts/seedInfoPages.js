// File Path: scripts/seedInfoPages.js

const mongoose = require('mongoose');
const InfoPage = require('../models/InfoPage');
const connectDB = require('../config/db');

// Connect to database
connectDB();

// Function to generate slug from title
function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

const comprehensiveInfoPages = [
  {
    title: 'Essential Services & Communication',
    description: 'SIM cards, data plans, Wi-Fi spots, banking services, and essential communication for visitors to Turks and Caicos.',
    icon: 'phone',
    color: '#8A2BE2',
    category: 'essential-services',
    featured: true,
    priority: 100,
    tags: ['sim cards', 'internet', 'communication', 'digicel', 'flow', 'wifi', 'banking', 'atm'],
    sections: [
      {
        title: 'Mobile Network Providers',
        content: [
          {
            name: 'Digicel',
            description: 'The leading telecommunications provider in Turks and Caicos, offering comprehensive mobile and internet services. SIM cards available at the airport, downtown stores, and major shopping areas with excellent coverage across all main islands.',
            additionalInfo: {
              phone: '+1-649-946-2222',
              website: 'https://www.digicelgroup.com/tc',
              hours: 'Mon-Fri 8:00 AM - 6:00 PM, Sat 9:00 AM - 4:00 PM',
              address: 'Graceway Plaza, Providenciales',
              features: [
                'Prepaid and postpaid plans',
                'Tourist SIM cards available',
                '4G LTE coverage throughout islands',
                'International roaming services',
                'Mobile hotspot devices',
                'Data packages starting from $15/day',
                'Airport pickup locations'
              ],
              tips: [
                'Buy SIM cards at airport for immediate connectivity',
                'Tourist packages offer better rates for short stays',
                'Coverage excellent on Providenciales and Grand Turk',
                'Bring unlocked phone for best compatibility'
              ]
            }
          },
          {
            name: 'Flow (Cable & Wireless)',
            description: 'Reliable telecommunications provider offering mobile services, internet, and cable TV. Known for good customer service and competitive data packages available on all main islands.',
            additionalInfo: {
              phone: '+1-649-946-4282',
              website: 'https://www.discoverflow.co/tc',
              hours: 'Mon-Fri 8:30 AM - 5:30 PM, Sat 9:00 AM - 2:00 PM',
              address: 'Butterfield Square, Providenciales',
              features: [
                'Comprehensive mobile plans',
                'High-speed internet packages',
                'Cable TV services',
                'International calling plans',
                'Business solutions available'
              ],
              tips: [
                'Often has promotions for new customers',
                'Good coverage in resort areas',
                'Offers bundled services for longer stays'
              ]
            }
          }
        ]
      },
      {
        title: 'Banking & ATM Services',
        content: [
          {
            name: 'ATM Locations & Banking',
            description: 'ATMs readily available throughout Providenciales with fewer options on other islands. Most accept international cards and dispense US dollars only.',
            additionalInfo: {
              banks: ['Scotiabank', 'First Caribbean International Bank', 'Turks and Caicos Banking Co.'],
              locations: [
                'Providenciales International Airport',
                'Grace Bay shopping areas', 
                'IGA Supermarket locations',
                'Major resort lobbies',
                'Downtown Providenciales'
              ],
              fees: [
                'Local ATM fees: $3-5 per transaction',
                'Your bank may charge additional fees',
                'Resort ATMs often have higher fees'
              ],
              tips: [
                'Notify your bank before traveling',
                'Use bank-affiliated ATMs when possible',
                'Withdraw larger amounts to minimize fees',
                'ATMs may run out of cash during peak season',
                'Have backup payment methods'
              ]
            }
          }
        ]
      }
    ],
    markers: [
      {
        coordinates: { latitude: 21.776838179671614, longitude: -72.22344281978086 },
        title: 'Digicel Store - Providenciales',
        description: 'Main Digicel store in downtown Providenciales',
        type: 'store'
      },
      {
        coordinates: { latitude: 21.77811354597816, longitude: -72.22876430002081 },
        title: 'Flow Store - Providenciales',
        description: 'Flow telecommunications store in Providenciales',
        type: 'store'
      }
    ]
  },

  {
    title: 'Transportation & Getting Around',
    description: 'Car rentals, taxis, inter-island travel, driving tips, and comprehensive transportation options throughout the islands.',
    icon: 'truck',
    color: '#4682B4',
    category: 'transportation',
    featured: true,
    priority: 95,
    tags: ['car rental', 'taxi', 'transportation', 'driving', 'ferry', 'airport', 'inter-island'],
    sections: [
      {
        title: 'Car Rentals',
        content: [
          {
            name: 'Major Rental Companies',
            description: 'International and local car rental companies offer vehicles for exploring the islands. Highly recommended for flexibility and cost-effectiveness with rates starting around $50/day including taxes and insurance.',
            additionalInfo: {
              companies: ['Avis', 'Hertz', 'Budget', 'Grace Bay Car Rentals', 'Tropical Auto Rentals', 'Rent a Buggy'],
              priceRange: '$45-150 per day depending on vehicle type',
              features: [
                'Airport pickup/delivery available',
                'Free hotel delivery and pickup',
                'Comprehensive insurance included',
                'Various vehicle sizes available',
                'GPS navigation systems',
                '24/7 roadside assistance'
              ],
              tips: [
                'Book in advance during peak season (Dec-Apr)',
                'International driving license recommended',
                'Remember: driving on the LEFT side',
                'Most roads are paved and well-maintained',
                'Parking is generally free and available',
                'Gas stations close early on smaller islands'
              ],
              warnings: [
                'Fuel expensive ($6-7 per gallon)',
                'Limited gas stations on smaller islands',
                'Some rental cars may show wear'
              ]
            }
          }
        ]
      },
      {
        title: 'Taxi Services',
        content: [
          {
            name: 'Taxi Transportation',
            description: 'Taxis readily available but can be expensive. Rates typically charged per person rather than per trip. Professional drivers often provide island tours and local recommendations.',
            additionalInfo: {
              priceRange: '$15-40 per person for common routes',
              features: [
                'Available at airport and major resorts',
                'Professional licensed drivers',
                'Air-conditioned vehicles',
                'Island tour services available',
                'Hotel and restaurant recommendations',
                'Shopping trip assistance'
              ],
              tips: [
                'Agree on fare before starting trip',
                'Ask for flat rate for day tours',
                'Drivers often earn commissions from referrals',
                'Tipping 15-20% is customary',
                'Book return trips in advance for remote areas'
              ],
              warnings: [
                'No Uber or Lyft available',
                'Rates higher than US/European standards',
                'Limited availability on smaller islands',
                'Avoid unmarked "jitney" taxis'
              ]
            }
          }
        ]
      },
      {
        title: 'Driving Guidelines',
        content: [
          {
            name: 'Road Rules & Safety',
            description: 'Essential driving information for visitors including local traffic laws, road conditions, and safety guidelines for driving in Turks and Caicos.',
            additionalInfo: {
              features: [
                'Drive on the LEFT side of the road',
                'Seatbelts mandatory for all passengers',
                'Speed limits strictly enforced',
                'Most roads paved and well-maintained',
                'Roundabouts common in Grace Bay area'
              ],
              tips: [
                'Take time to adjust to left-side driving',
                'Watch for cyclists and pedestrians',
                'Be cautious during rainy weather',
                'Keep doors locked in isolated areas',
                'Carry emergency water and phone charger'
              ]
            }
          }
        ]
      }
    ],
    markers: [
      {
        coordinates: { latitude: 21.773, longitude: -72.209 },
        title: 'Providenciales International Airport',
        description: 'Main airport with car rental desks and taxi services',
        type: 'airport'
      }
    ]
  },

  {
    title: 'Dining & Local Cuisine Guide',
    description: 'Traditional dishes, popular restaurants, local specialties, and comprehensive culinary experiences unique to Turks and Caicos.',
    icon: 'coffee',
    color: '#FFA07A',
    category: 'dining',
    featured: true,
    priority: 90,
    tags: ['restaurants', 'conch', 'seafood', 'local food', 'dining', 'cuisine', 'grace bay'],
    sections: [
      {
        title: 'Traditional Local Cuisine',
        content: [
          {
            name: 'Conch - The National Dish',
            description: 'The queen conch is the signature ingredient of Turks and Caicos cuisine. This large sea snail is prepared in various traditional ways and appears on virtually every local restaurant menu.',
            additionalInfo: {
              dishes: [
                'Conch fritters (breaded and deep-fried)',
                'Conch salad (raw with lime and vegetables)', 
                'Conch chowder (hearty cream-based soup)',
                'Curried conch (Caribbean-style curry)',
                'Conch creole (tomato-based stew)',
                'Steamed conch (traditional preparation)'
              ],
              preparations: [
                'Freshly caught and cleaned daily',
                'Tenderized before cooking',
                'Seasoned with local spices',
                'Often served with scotch bonnet peppers'
              ],
              tips: [
                'Try conch salad for most authentic experience',
                'Conch fritters perfect for first-timers',
                'Best served with local hot sauce',
                'Prices typically $12-25 per dish'
              ]
            }
          },
          {
            name: 'Fresh Seafood Specialties',
            description: 'Abundant fresh fish and lobster caught daily in local waters. Grouper, snapper, and Caribbean spiny lobster are local favorites prepared with traditional Caribbean flavors.',
            additionalInfo: {
              varieties: [
                'Nassau grouper (pan-fried or grilled)',
                'Yellowtail snapper (whole or filleted)',
                'Caribbean spiny lobster (grilled or steamed)',
                'Mahi-mahi (grilled with island spices)',
                'Tuna (seared or in fresh salads)'
              ],
              preparations: [
                'Grilled with local island spices',
                'Pan-fried with fresh herbs',
                'Steamed with local vegetables',
                'Blackened Cajun-style',
                'Traditional fish stews'
              ],
              tips: [
                'Ask for "catch of the day" specials',
                'Lobster season: August to March',
                'Prices vary by season and availability',
                'Best at authentic beachfront restaurants'
              ]
            }
          }
        ]
      },
      {
        title: 'Must-Try Local Restaurants',
        content: [
          {
            name: 'Da Conch Shack',
            description: 'Iconic beachfront restaurant specializing in conch dishes. Famous for its relaxed Caribbean atmosphere and authentic local cuisine with stunning Blue Hills Beach ocean views.',
            additionalInfo: {
              address: 'Blue Hills Beach, Providenciales',
              hours: 'Daily 11:00 AM - 9:00 PM',
              priceRange: '$15-35 per entree',
              specialties: [
                'Conch fritters (house specialty)',
                'Fresh conch salad',
                'Grilled Caribbean lobster',
                'Daily fresh fish specials',
                'Rum punch and local cocktails'
              ],
              features: [
                'Beachfront dining with ocean views',
                'Live music Thursday evenings',
                'Casual beach atmosphere',
                'Popular with locals and tourists',
                'Authentic Turks and Caicos experience'
              ]
            }
          },
          {
            name: 'Caribbean Element',
            description: 'Modern Caribbean fusion restaurant offering creative interpretations of traditional dishes with international influences. Known for exceptional presentation and innovative cocktails.',
            additionalInfo: {
              address: 'Le Vele Plaza, Grace Bay Road',
              hours: 'Dinner only: 5:00 PM - 10:00 PM',
              phone: '+1-649-348-6424',
              specialties: [
                'Whole snapper with coconut risotto',
                'Guinness oxtail stew',
                'Caribbean fusion tasting menu',
                'Craft cocktails with local ingredients'
              ],
              features: [
                'Upscale casual dining atmosphere',
                'Internationally trained chefs',
                'Creative menu presentation',
                'Extensive wine list',
                'Reservations recommended'
              ]
            }
          }
        ]
      },
      {
        title: 'Fine Dining & International Options',
        content: [
          {
            name: 'Grace Bay Restaurant Scene',
            description: 'The Grace Bay area offers over 60 restaurants ranging from casual beachside eateries to world-class gourmet establishments featuring international cuisine and award-winning chefs.',
            additionalInfo: {
              varieties: [
                'Italian cuisine (Coco Bistro, Baci Ristorante)',
                'French fine dining (Provence)',
                'Asian fusion (Sui-Ren, Yoshi\'s Sushi)',
                'Mediterranean flavors',
                'Contemporary American cuisine'
              ],
              features: [
                'Award-winning international chefs',
                'Oceanfront dining locations',
                'Extensive wine selections from around the world',
                'Romantic sunset dining settings',
                'Private dining options available'
              ],
              priceRange: '$35-85 per person for dinner',
              tips: [
                'Reservations essential for dinner',
                'Many restaurants closed Sundays',
                'Dress codes vary by establishment',
                'Standard tipping: 15-18%'
              ]
            }
          }
        ]
      }
    ],
    markers: []
  },

  {
    title: 'Beach Guide & Water Activities',
    description: 'World-famous beaches, comprehensive water sports, marine activities, and beach safety in crystal-clear Caribbean waters.',
    icon: 'umbrella',
    color: '#40E0D0',
    category: 'activities',
    featured: true,
    priority: 85,
    tags: ['beaches', 'grace bay', 'water sports', 'snorkeling', 'kiteboarding', 'diving', 'activities'],
    sections: [
      {
        title: 'World-Class Beaches',
        content: [
          {
            name: 'Grace Bay Beach',
            description: 'Consistently voted the world\'s best beach by TripAdvisor, Grace Bay features 12 miles of pristine white sand and incredibly clear turquoise water. Protected by a barrier reef creating calm, safe swimming conditions year-round.',
            additionalInfo: {
              features: [
                '12 miles of pristine white powder sand',
                'Crystal-clear turquoise water',
                'Protected by extensive barrier reef',
                'Calm swimming conditions year-round',
                'No private beaches - all public access',
                'Numerous beachfront luxury resorts'
              ],
              activities: [
                'Swimming in calm, warm waters',
                'Snorkeling at nearby coral reefs',
                'Beach volleyball courts',
                'Sunset walking and photography',
                'Beachfront dining experiences',
                'Water sports equipment rentals'
              ],
              tips: [
                'Free public access along entire beach',
                'Best snorkeling at Smith\'s Reef (east end)',
                'Spectacular sunset views from western end',
                'Beach chairs available at resort areas',
                'Use SPF 30+ sunscreen - strong Caribbean sun'
              ]
            }
          },
          {
            name: 'Long Bay Beach',
            description: 'A stunning 3-mile stretch of beach renowned for shallow, warm waters and consistent trade winds. Internationally recognized as one of the world\'s best kiteboarding destinations.',
            additionalInfo: {
              features: [
                '3 miles of pristine beach shoreline',
                'Shallow, warm water ideal for learning',
                'Consistent trade winds year-round',
                'Soft white sand bottom for safety',
                'Less crowded than Grace Bay'
              ],
              activities: [
                'Kiteboarding (world-class conditions)',
                'Windsurfing lessons and rentals',
                'Stand-up paddleboarding',
                'Swimming and wading',
                'Beach walks and jogging',
                'Photography and relaxation'
              ],
              tips: [
                'Perfect for kiteboarding beginners',
                'Water rarely deeper than waist-high',
                'Best wind conditions: afternoon/evening',
                'Multiple kite schools on beach',
                'Bring water and snacks - fewer amenities'
              ]
            }
          }
        ]
      },
      {
        title: 'Water Sports & Marine Activities',
        content: [
          {
            name: 'Kiteboarding Paradise',
            description: 'Turks and Caicos is considered one of the world\'s premier kiteboarding destinations. Long Bay Beach offers perfect learning conditions with shallow water, consistent winds, and professional instruction.',
            additionalInfo: {
              locations: [
                'Long Bay Beach (primary location)',
                'East Bay, South Caicos',
                'Salterra Beach, South Caicos'
              ],
              conditions: [
                'Consistent trade winds year-round',
                'Shallow, warm water (waist-deep)',
                'Soft sand bottom for safety',
                'Miles of open water space',
                'Excellent wind statistics'
              ],
              schools: [
                'Turks and Caicos Kiteboarding',
                'Kite Provo (professional instruction)',
                'Big Blue Collective',
                'Jedi Kiteboarding'
              ],
              tips: [
                'Best learning conditions in Caribbean',
                'Lesson packages start around $150/session',
                'Equipment rental available daily',
                'IKO certification courses offered'
              ]
            }
          },
          {
            name: 'Scuba Diving & Snorkeling',
            description: 'Home to the third-largest barrier reef system in the world, offering exceptional diving and snorkeling with visibility often exceeding 100 feet and diverse marine life.',
            additionalInfo: {
              features: [
                'Third-largest barrier reef globally',
                'Visibility often exceeds 100 feet',
                'Dramatic wall dives available',
                'Abundant diverse marine life',
                'Multiple shipwrecks to explore'
              ],
              topSites: [
                'The Grand Turk Wall (world-famous)',
                'Amphitheatre at Grace Bay',
                'West Caicos Marine National Park',
                'French Cay coral gardens',
                'Molasses Reef formations'
              ],
              marineLife: [
                'Caribbean reef sharks',
                'Green and hawksbill sea turtles',
                'Southern stingrays and eagle rays',
                'Atlantic spotted dolphins',
                'Humpback whales (winter migration)',
                'Over 200 species of tropical fish'
              ],
              tips: [
                'Bring valid certification cards',
                'Boat dives offer greatest variety',
                'Shore snorkeling excellent at Smith\'s Reef',
                'Whale watching season: January-April'
              ]
            }
          }
        ]
      }
    ],
    markers: [
      {
        coordinates: { latitude: 21.7759, longitude: -72.2852 },
        title: 'Grace Bay Beach',
        description: 'World-famous beach with pristine white sand',
        type: 'beach'
      },
      {
        coordinates: { latitude: 21.7858, longitude: -72.3089 },
        title: 'Long Bay Beach',
        description: 'Premier kiteboarding destination with shallow waters',
        type: 'beach'
      }
    ]
  },

  {
    title: 'Currency, Banking & Practical Information',
    description: 'Essential financial information, banking services, tipping guidelines, and comprehensive practical tips for visitors.',
    icon: 'dollar-sign',
    color: '#4B0082',
    category: 'practical-info',
    featured: false,
    priority: 80,
    tags: ['currency', 'banking', 'ATM', 'money', 'practical', 'tips', 'tipping'],
    sections: [
      {
        title: 'Currency & Payment Methods',
        content: [
          {
            name: 'US Dollar - Official Currency',
            description: 'The US Dollar is the official and only accepted currency in Turks and Caicos. This makes travel extremely convenient for American visitors as no currency exchange is needed.',
            additionalInfo: {
              features: [
                'US Dollar is sole official currency',
                'No currency exchange needed for US visitors',
                'All prices quoted in USD',
                'US coins and bills accepted everywhere',
                'Credit cards widely accepted at resorts'
              ],
              accepted: [
                'Visa (most widely accepted)',
                'Mastercard (widely accepted)', 
                'American Express (limited acceptance)',
                'Discover (very limited acceptance)'
              ],
              limitations: [
                'Smaller local vendors prefer cash',
                'Some restaurants add automatic service charges',
                'ATM fees can be substantial',
                'Foreign transaction fees may apply'
              ],
              tips: [
                'Bring small bills for tips and local purchases',
                'Notify banks before international travel',
                'Keep backup payment methods available',
                'Canadian dollars not widely accepted'
              ]
            }
          }
        ]
      },
      {
        title: 'Tipping Guidelines',
        content: [
          {
            name: 'Service Tipping Standards',
            description: 'Tipping is customary and very much appreciated throughout Turks and Caicos. Standard US tipping practices apply, though some establishments automatically add service charges.',
            additionalInfo: {
              restaurants: '15-20% of bill (if no automatic service charge)',
              bars: '$1-2 per drink depending on service',
              taxis: '15-20% of total fare',
              hotels: '$2-5 per bag for bellhops, $3-5 per day for housekeeping',
              tours: '$10-20 per person for excellent service',
              spas: '15-20% of total service cost',
              tips: [
                'Always check bills for automatic service charges',
                'Tip in cash when possible for direct benefit',
                'Higher tips appreciated for exceptional service',
                'Some all-inclusive resorts have no-tipping policies'
              ]
            }
          }
        ]
      }
    ],
    markers: []
  },

  {
    title: 'Safety, Health & Emergency Information',
    description: 'Comprehensive safety guidelines, health tips, emergency contacts, and medical facilities for travelers.',
    icon: 'shield',
    color: '#DC143C',
    category: 'safety-health',
    featured: false,
    priority: 75,
    tags: ['safety', 'health', 'emergency', 'medical', 'hospitals', 'police'],
    sections: [
      {
        title: 'Emergency Services',
        content: [
          {
            name: 'Emergency Contact Numbers',
            description: 'Essential emergency contact information for police, fire, ambulance, and medical services throughout Turks and Caicos.',
            additionalInfo: {
              features: [
                'Police: Dial 911 for immediate assistance',
                'Fire Department: Dial 911',
                'Ambulance/Medical Emergency: Dial 911',
                'Coast Guard: +1-649-946-4970',
                'Providenciales Hospital: +1-649-946-4201'
              ],
              tips: [
                'Emergency services available 24/7',
                'Response times faster on Providenciales',
                'US Embassy services through Nassau, Bahamas',
                'Travel insurance highly recommended'
              ]
            }
          }
        ]
      },
      {
        title: 'Health & Medical Facilities',
        content: [
          {
            name: 'Medical Services & Pharmacies',
            description: 'Information about medical facilities, pharmacies, and healthcare services available to visitors throughout the islands.',
            additionalInfo: {
              features: [
                'Providenciales General Hospital (main facility)',
                'Grace Bay Medical Centre (private clinic)',
                 'Multiple pharmacies in Grace Bay area',
                'Dental services available',
                'Some specialists available'
              ],
              tips: [
                'Bring prescription medications in original bottles',
                'Travel insurance essential for medical coverage',
                'Limited medical facilities on outer islands',
                'Medical evacuation insurance recommended'
              ]
            }
          }
        ]
      }
    ],
    markers: []
  },

  {
    title: 'Weather & Best Times to Visit',
    description: 'Comprehensive weather information, seasonal travel tips, hurricane season details, and optimal timing for your visit.',
    icon: 'sun',
    color: '#FFD700',
    category: 'weather-climate',
    featured: false,
    priority: 70,
    tags: ['weather', 'climate', 'seasons', 'hurricane', 'travel times'],
    sections: [
      {
        title: 'Year-Round Climate',
        content: [
          {
            name: 'Tropical Climate Overview',
            description: 'Turks and Caicos enjoys a tropical climate with warm temperatures year-round, steady trade winds, and relatively low humidity compared to other Caribbean destinations.',
            additionalInfo: {
              features: [
                'Average temperature: 80-85°F (27-29°C)',
                'Water temperature: 78-84°F year-round',
                'Steady trade winds provide cooling',
                'Low humidity compared to other Caribbean islands',
                'Abundant sunshine throughout the year'
              ],
              seasons: [
                'High Season: December-April (ideal weather, higher prices)',
                'Shoulder Season: May and November (good weather, lower prices)',
                'Low Season: June-October (hot, humid, hurricane season)',
                'Hurricane Season: June 1 - November 30 (peak: August-October)'
              ],
              tips: [
                'April-May offer best value with great weather',
                'Avoid September-October (peak hurricane season)',
                'December-March most expensive but ideal conditions',
                'Book accommodations early for peak season'
              ]
            }
          }
        ]
      }
    ],
    markers: []
  }
];

// Function to seed the database
async function seedInfoPages() {
  try {
    console.log('🌱 Starting info pages seeding...');
    
    // Clear existing data
    await InfoPage.deleteMany({});
    console.log('🗑️  Cleared existing info pages');
    
    // Insert new data one by one to trigger middleware
    console.log('📝 Creating info pages...');
    const insertedPages = [];
    
    for (let i = 0; i < comprehensiveInfoPages.length; i++) {
      const pageData = comprehensiveInfoPages[i];
      
      // Generate slug from title
      const slug = generateSlug(pageData.title);
      
      console.log(`   Creating: ${pageData.title} → ${slug}`);
      
      const newPage = new InfoPage({
        ...pageData,
        slug: slug
      });
      
      const savedPage = await newPage.save();
      insertedPages.push(savedPage);
    }
    
    console.log(`✅ Successfully seeded ${insertedPages.length} info pages`);
    
    // Display summary
    console.log('\n📊 Seeding Summary:');
    const categories = await InfoPage.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    categories.forEach(cat => {
      console.log(`   ${cat._id}: ${cat.count} pages`);
    });
    
    console.log(`\n🎯 Featured pages: ${insertedPages.filter(p => p.featured).length}`);
    console.log(`📍 Total map markers: ${insertedPages.reduce((sum, p) => sum + (p.markers ? p.markers.length : 0), 0)}`);
    console.log(`🏷️  Total tags: ${insertedPages.reduce((sum, p) => sum + (p.tags ? p.tags.length : 0), 0)}`);
    
    // Display created slugs for verification
    console.log('\n🔗 Generated slugs:');
    insertedPages.forEach(page => {
      console.log(`   ${page.title} → ${page.slug}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding info pages:', error);
    process.exit(1);
  }
}

// Run seeder if called directly
if (require.main === module) {
  seedInfoPages();
}

module.exports = { seedInfoPages, comprehensiveInfoPages };