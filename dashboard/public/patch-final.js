const fs = require('fs');
const https = require('https');
const path = require('path');

const file = path.join(__dirname, 'halon-home.html');

https.get('https://www.cantor8.io/', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    let content = data;
    
    // SAFE TEXT REPLACEMENTS (Only outside of tags/attributes)
    // We split by '>' and '<' to only touch text nodes, avoiding URLs!
    const parts = content.split('>');
    for (let i = 0; i < parts.length; i++) {
      let subParts = parts[i].split('<');
      if (subParts.length === 2) {
        let textNode = subParts[0];
        textNode = textNode.replace(/Cantor8/gi, 'HALON');
        textNode = textNode.replace(/Cantor/gi, 'Halon');
        textNode = textNode.replace(/Canton/gi, 'Halon');
        subParts[0] = textNode;
        parts[i] = subParts.join('<');
      }
    }
    content = parts.join('>');

    // Specific Attribute Replacements (Meta tags, JSON-LD, etc)
    content = content.replace(/content="[^"]*Cantor8[^"]*"/gi, (match) => match.replace(/Cantor8/gi, 'HALON'));
    content = content.replace(/content="[^"]*Canton[^"]*"/gi, (match) => match.replace(/Canton/gi, 'Halon'));
    content = content.replace(/content="[^"]*Cantor[^"]*"/gi, (match) => match.replace(/Cantor/gi, 'Halon'));
    
    // JSON-LD replacements
    content = content.replace(/"name":\s*"[^"]*"/gi, (match) => match.replace(/Cantor8/gi, 'HALON').replace(/Canton/gi, 'Halon').replace(/Cantor/gi, 'Halon'));
    content = content.replace(/"description":\s*"[^"]*"/gi, (match) => match.replace(/Cantor8/gi, 'HALON').replace(/Canton/gi, 'Halon').replace(/Cantor/gi, 'Halon'));

    // Logo Image URL
    content = content.replace(/https:\/\/cdn\.prod\.website-files\.com\/[^\/]+\/[^"]*_Cantor8(?:%20| )Logo\.svg/gi, '/halon-mark.png');

    // Hide Newsroom and Blog
    content = content.replace(/<a[^>]*href="\/newsroom"[^>]*>.*?<\/a>/gi, '');
    content = content.replace(/<a[^>]*href="\/official-blog"[^>]*>.*?<\/a>/gi, '');

    // Inject CSS & JS Overrides to force Black & Logo
    const overrideStyles = `
<style>
  /* Force Logo Override */
  .svg_logo, .header .svg_logo, .logo, .logo_footer img {
    background-image: url('/halon-mark.png') !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: left center !important;
  }
  img.svg_logo, img[alt*="HALON"], img[alt*="Cantor"] {
    content: url('/halon-mark.png') !important;
  }
  
  /* Force all Blues to Halon Black */
  body, .strings-viewport, canvas, .bg-blue, .section-blue, [style*="#044ab3"], [style*="#044AB3"], .blue {
    background-color: #000000 !important;
    background: #000000 !important;
  }
  
  #webgl-container, canvas {
    background: #000000 !important;
  }
</style>
<script>
  window.BLUE_LOGO = '/halon-mark.png';
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.includes('Logo')) {
        img.src = '/halon-mark.png';
        img.srcset = '';
      }
    });
    document.querySelectorAll('.strings-viewport, canvas, [data-from]').forEach(el => {
      el.style.setProperty('background', '#000000', 'important');
      if (el.dataset && el.dataset.from) {
        el.dataset.from = '#000000';
      }
    });
  });
</script>
</head>
`;
    content = content.replace('</head>', overrideStyles);

    fs.writeFileSync(file, content);
    console.log("Patched safely and injected overrides!");
  });
});
