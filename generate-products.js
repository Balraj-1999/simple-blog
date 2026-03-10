// products-bulk-add.js
// Yeh script aapko 50 products automatically generate karega

const fs = require('fs');

function generateProducts() {
  const categories = ['Cricket', 'Football', 'Boxing', 'Running', 'Wrestling', 'Gym', 'Yoga', 'Badminton', 'Tennis', 'Swimming'];
  const brands = ['SG', 'Spartan', 'Adidas', 'Nike', 'Puma', 'Kookaburra', 'Gray-Nicolls', 'Reebok', 'Under Armour', 'Yonex'];
  
  const products = [];
  
  for (let i = 1; i <= 50; i++) {
    const category = categories[Math.floor(Math.random() * categories.length)];
    const brand = brands[Math.floor(Math.random() * brands.length)];
    const price = Math.floor(Math.random() * (15000 - 499 + 1)) + 499;
    
    let name = '';
    let sizes = [];
    let colors = ['Red', 'Black', 'Blue', 'White', 'Grey', 'Navy', 'Green', 'Yellow'];
    
    // Category ke according product names generate karo
    if (category === 'Cricket') {
      const cricketItems = ['Cricket Bat', 'Cricket Ball', 'Helmet', 'Leg Pads', 'Batting Gloves', 'Keeping Gloves', 'Thigh Guard', 'Abdominal Guard', 'Cricket Kit Bag', 'Stumps'];
      name = `${brand} ${cricketItems[Math.floor(Math.random() * cricketItems.length)]}`;
      sizes = ['Short', 'Medium', 'Long', 'Short Handle', 'Long Handle', 'Junior', 'Senior'];
    } 
    else if (category === 'Football') {
      const footballItems = ['Football Shoes', 'Football', 'Shin Guards', 'Goalkeeper Gloves', 'Socks', 'Jersey', 'Shorts'];
      name = `${brand} ${footballItems[Math.floor(Math.random() * footballItems.length)]}`;
      sizes = ['S', 'M', 'L', 'XL', 'XXL', '3', '4', '5'];
    }
    else if (category === 'Boxing') {
      const boxingItems = ['Boxing Gloves', 'Hand Wraps', 'Head Guard', 'Punching Bag', 'Boxing Shorts', 'Mouth Guard', 'Sparring Gear'];
      name = `${brand} ${boxingItems[Math.floor(Math.random() * boxingItems.length)]}`;
      sizes = ['S', 'M', 'L', 'XL', 'XXL', '8oz', '10oz', '12oz', '14oz', '16oz'];
    }
    else if (category === 'Running') {
      const runningItems = ['Running Shoes', 'Running Shorts', 'Running T-Shirt', 'Track Pants', 'Sports Socks', 'Cap', 'Water Bottle'];
      name = `${brand} ${runningItems[Math.floor(Math.random() * runningItems.length)]}`;
      sizes = ['6', '7', '8', '9', '10', '11', '12', 'S', 'M', 'L', 'XL'];
    }
    else if (category === 'Wrestling') {
      const wrestlingItems = ['Wrestling Shoes', 'Singlet', 'Knee Pads', 'Head Gear', 'Training Mat'];
      name = `${brand} ${wrestlingItems[Math.floor(Math.random() * wrestlingItems.length)]}`;
      sizes = ['S', 'M', 'L', 'XL', 'XXL', '6', '7', '8', '9', '10'];
    }
    else if (category === 'Gym') {
      const gymItems = ['Gym Shoes', 'Training Gloves', 'Gym Bag', 'Water Bottle', 'Protein Shaker', 'Lifting Belt', 'Wrist Wraps', 'Gym Towel'];
      name = `${brand} ${gymItems[Math.floor(Math.random() * gymItems.length)]}`;
      sizes = ['S', 'M', 'L', 'XL', 'One Size'];
    }
    else if (category === 'Badminton') {
      const badmintonItems = ['Badminton Racket', 'Shuttlecock', 'Badminton Shoes', 'Grip', 'Badminton Net', 'Racket Cover'];
      name = `${brand} ${badmintonItems[Math.floor(Math.random() * badmintonItems.length)]}`;
      sizes = ['G2', 'G3', 'G4', 'G5', 'One Size'];
    }
    else {
      name = `${brand} ${category} Equipment ${i}`;
      sizes = ['S', 'M', 'L', 'XL', 'One Size'];
    }
    
    // Create sizeStock object
    const sizeStock = {};
    const selectedColors = [];
    
    // Random colors select karo (2-4 colors)
    const numColors = Math.floor(Math.random() * 3) + 2;
    for (let c = 0; c < numColors; c++) {
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      if (!selectedColors.includes(randomColor)) {
        selectedColors.push(randomColor);
      }
    }
    
    // Sizes ke liye stock add karo
    sizes.slice(0, 5).forEach(size => {
      sizeStock[size] = Math.floor(Math.random() * 25) + 1;
    });
    
    // Discount calculate karo (random)
    let finalPrice = price;
    let discount = null;
    
    if (Math.random() > 0.6) {
      const discountPercent = Math.floor(Math.random() * 40) + 5;
      finalPrice = Math.round(price - (price * discountPercent / 100));
      discount = {
        type: 'percentage',
        value: discountPercent
      };
    }
    
    products.push({
      name: name,
      originalPrice: price,
      price: finalPrice,
      discount: discount,
      category: category,
      stock: Object.values(sizeStock).reduce((a, b) => a + b, 0),
      sizeStock: sizeStock,
      description: `${brand} ka premium quality ${category} product. ${category} ke liye specially designed. Comfortable, durable and stylish. Professional athletes ke liye perfect.`,
      colors: selectedColors,
      images: [], // Images aap baad mein add kar sakte hain
      featured: Math.random() > 0.7,
      active: true,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }
  
  // Existing products padho agar file exist karti hai
  let existingProducts = [];
  try {
    if (fs.existsSync('posts.json')) {
      existingProducts = JSON.parse(fs.readFileSync('posts.json', 'utf8'));
    }
  } catch (e) {
    existingProducts = [];
  }
  
  // Combine existing aur new products
  const allProducts = [...existingProducts, ...products];
  
  // Save to posts.json
  fs.writeFileSync('posts.json', JSON.stringify(allProducts, null, 2));
  
  console.log('✅ 50 products successfully generated and added to posts.json!');
  console.log(`📦 Total products now: ${allProducts.length}`);
}

generateProducts();