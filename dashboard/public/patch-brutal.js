const fs = require('fs');
const https = require('https');
const path = require('path');

const file = path.join(__dirname, 'cantor.html');

https.get('https://www.cantor8.io/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    let content = data;
    
    // 1. Replace Colors Globally
    content = content.replace(/#044AB3/gi, '#000000');
    content = content.replace(/#044ab3/gi, '#000000');
    content = content.replace(/rgb\(\s*4\s*,\s*74\s*,\s*179\s*\)/gi, 'rgb(0,0,0)');
    content = content.replace(/rgba\(\s*4\s*,\s*74\s*,\s*179/gi, 'rgba(0,0,0');
    // Light blue accents to Halon Green
    content = content.replace(/#6FE3FF/gi, '#c8e63c');
    content = content.replace(/rgb\(\s*111\s*,\s*227\s*,\s*255\s*\)/gi, 'rgb(200,230,60)');

    // 2. Replace Text Globally
    content = content.replace(/Cantor8/g, 'HALON');
    content = content.replace(/cantor8/g, 'halon');
    content = content.replace(/Cantor/g, 'Halon');
    content = content.replace(/cantor/g, 'halon');

    // 3. Fix the broken URLs and attributes!
    // The CSS file
    content = content.replace(/halon8-website-landing\.webflow/gi, 'cantor8-website-landing.webflow');
    // Webflow domains
    content = content.replace(/www\.halon8\.io/gi, 'www.cantor8.io');
    
    // 4. Logo Replacement
    // The original logo URL contains 'Cantor8%20Logo.svg' -> 'HALON%20Logo.svg'
    content = content.replace(/https:\/\/cdn\.prod\.website-files\.com\/[^\/]+\/[^"]*HALON(?:%20| )Logo\.svg/gi, '/halon-mark.png');
    // Fallback: Just look for any img with alt="HALON" (previously Cantor8) and replace src
    content = content.replace(/<img([^>]*)alt="HALON"/gi, (match, p1) => {
      // replace src inside p1
      return '<img' + p1.replace(/src="[^"]+"/, 'src="/halon-mark.png"') + 'alt="HALON"';
    });

    // 5. Hide Newsroom and Blog
    content = content.replace(/<a[^>]*href="\/newsroom"[^>]*>.*?<\/a>/gi, '');
    content = content.replace(/<a[^>]*href="\/official-blog"[^>]*>.*?<\/a>/gi, '');

    fs.writeFileSync(file, content);
    console.log("Patched brutally and fixed URLs!");
  });
});
