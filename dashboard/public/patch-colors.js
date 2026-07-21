const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'halon-home.html');
let content = fs.readFileSync(file, 'utf8');

// Replace all blue color values with black globally in the HTML!
content = content.replace(/#044ab3/gi, '#000000');
content = content.replace(/#044AB3/gi, '#000000');
content = content.replace(/rgb\(\s*4\s*,\s*74\s*,\s*179\s*\)/gi, 'rgb(0,0,0)');
content = content.replace(/rgba\(\s*4\s*,\s*74\s*,\s*179\s*,/gi, 'rgba(0,0,0,');

fs.writeFileSync(file, content);
console.log("Colors replaced in halon-home.html!");
