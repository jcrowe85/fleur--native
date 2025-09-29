// Test script to check product image data
const { fetchAllProducts } = require('./src/services/shopifyClient.ts');

async function testProductImages() {
  try {
    console.log('🔍 Fetching all products from Shopify...');
    const products = await fetchAllProducts();
    
    console.log(`\n📊 Found ${products.length} products total`);
    
    // Check specific products that might have image issues
    const problemProducts = ['hair-mask', 'detangling-comb', 'micro-roller', 'bloom', 'shampoo', 'conditioner'];
    
    console.log('\n🔍 Checking product image data:');
    problemProducts.forEach(handle => {
      const product = products.find(p => p.handle === handle);
      if (product) {
        const imageUrl = product.images?.edges?.[0]?.node?.url;
        console.log(`\n• ${handle}:`);
        console.log(`  Title: ${product.title}`);
        console.log(`  Image URL: ${imageUrl || 'NO IMAGE'}`);
        console.log(`  Has images: ${product.images?.edges?.length || 0}`);
      } else {
        console.log(`\n• ${handle}: NOT FOUND`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testProductImages();
