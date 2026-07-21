const fs = require('fs');
const https = require('https');
const path = require('path');

const file = path.join(__dirname, 'cantor.html');

https.get('https://www.cantor8.io/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    let content = data;
    
    // Replace text strictly
    content = content.replace(/>Cantor8</g, '>HALON<');
    content = content.replace(/>Cantor8/g, '>HALON');
    content = content.replace(/Cantor8</g, 'HALON<');
    content = content.replace(/Cantor Network/g, 'Halon Network');
    
    // Replace colors carefully in styles and attributes
    content = content.replace(/#044AB3/g, '#000000');
    content = content.replace(/#044ab3/g, '#000000');
    content = content.replace(/rgb\(4, 74, 179\)/g, 'rgb(0, 0, 0)');
    content = content.replace(/rgba\(4, 74, 179/g, 'rgba(0, 0, 0');

    // Replace Logos
    content = content.replace(/https:\/\/cdn\.prod\.website-files\.com\/[a-z0-9]+\/[a-z0-9]+_Cantor8(?:%20| )Logo\.svg/g, '/halon-mark.png');

    // Hide Newsroom and Blog
    content = content.replace(/<a[^>]*href="\/newsroom"[^>]*>.*?<\/a>/g, '');
    content = content.replace(/<a[^>]*href="\/official-blog"[^>]*>.*?<\/a>/g, '');

    fs.writeFileSync(file, content);
    console.log("Patched correctly!");
  });
});
