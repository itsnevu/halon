const fs = require('fs');
const https = require('https');
const path = require('path');

const file = path.join(__dirname, 'cantor.html');

https.get('https://www.cantor8.io/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    
    let content = data;
    
    // 1. Replace main background colors
    // #044ab3 -> #000000
    content = content.replace(/#044ab3/gi, '#000000');
    // rgba(4, 74, 179) -> rgba(0, 0, 0)
    content = content.replace(/rgba\(4,\s*74,\s*179/gi, 'rgba(0, 0, 0');
    // rgb(4, 74, 179) -> rgb(0, 0, 0)
    content = content.replace(/rgb\(4,\s*74,\s*179\)/gi, 'rgb(0, 0, 0)');
    
    // Some accent colors
    content = content.replace(/#6FE3FF/gi, '#c8e63c');
    
    // 2. Safe text replacements (avoiding URLs and attributes)
    // Replace Cantor8 only if it's inside text nodes or specific non-URL places.
    // A quick heuristic: split by '>', replace in the text before '<', then join back.
    const parts = content.split('>');
    for (let i = 0; i < parts.length; i++) {
      let subParts = parts[i].split('<');
      if (subParts.length === 2) {
        // subParts[0] is text content, subParts[1] is the next tag's attributes
        subParts[0] = subParts[0].replace(/Cantor8/gi, 'HALON');
        subParts[0] = subParts[0].replace(/Cantor/gi, 'Halon');
        parts[i] = subParts.join('<');
      }
    }
    content = parts.join('>');

    // Update <title> and meta tags specifically since they are attributes
    content = content.replace(/content="[^"]*Cantor8[^"]*"/gi, (match) => match.replace(/Cantor8/gi, 'HALON'));
    content = content.replace(/content="[^"]*Cantor[^"]*"/gi, (match) => match.replace(/Cantor/gi, 'Halon'));

    // 3. Remove Newsroom / Blog (safe regex)
    content = content.replace(/<a[^>]*href="\/newsroom"[^>]*>.*?<\/a>/gi, '');
    content = content.replace(/<a[^>]*href="\/official-blog"[^>]*>.*?<\/a>/gi, '');

    // 4. Replace Logo (Cantor8 Logo.svg)
    content = content.replace(/https:\/\/cdn\.prod\.website-files\.com\/[^\/]+\/.*_Cantor8(?:%20| )Logo\.svg/gi, '/halon-mark.png');

    fs.writeFileSync(file, content);
    console.log("Successfully downloaded and patched cantor.html without breaking CSS!");
  });
});
