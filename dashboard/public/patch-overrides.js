const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'halon-home.html');
let content = fs.readFileSync(file, 'utf8');

// Replace Canton with Halon (missed previously because it was Canton, not Cantor)
content = content.replace(/Canton/g, 'Halon');
content = content.replace(/canton/g, 'halon');

// Append a massive override style to the <head>
const overrideStyles = `
<style>
  /* Force Logo Override */
  .svg_logo, .header .svg_logo, .logo, .logo_footer img {
    background-image: url('/halon-mark.png') !important;
    background-size: contain !important;
    background-repeat: no-repeat !important;
    background-position: left center !important;
  }
  /* Hide the actual img if it's set as background, or force src if it's an img */
  img.svg_logo {
    content: url('/halon-mark.png') !important;
  }
  
  /* Force all Cantor Blues to Halon Black */
  body, .strings-viewport, canvas, .bg-blue, .section-blue, [style*="#044ab3"], [style*="#044AB3"], .blue {
    background-color: #000000 !important;
    background: #000000 !important;
  }
  
  /* Force Webflow Canvas to be black if transparent */
  #webgl-container, canvas {
    background: #000000 !important;
  }
</style>
<script>
  // Forcefully override WebGL variables if they exist in window
  window.BLUE_LOGO = '/halon-mark.png';
  document.addEventListener('DOMContentLoaded', () => {
    // Force logo src just in case
    document.querySelectorAll('img').forEach(img => {
      if (img.src && img.src.includes('Logo')) {
        img.src = '/halon-mark.png';
        img.srcset = '';
      }
    });
    // Force background color on WebGL container
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
console.log("Applied absolute overrides!");
