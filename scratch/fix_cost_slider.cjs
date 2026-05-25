const fs = require('fs');
const path = require('path');

const filePath = path.join('d:/TheGlobalAvenues-CRM', 'src/app/components/cost-of-living-slider.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace blue theme with orange/dark charcoal theme
content = content.replace(/#001F3F/g, '#1A0A00');
content = content.replace(/#0074D9/g, '#FD7E14');
content = content.replace(/text-blue-600/g, 'text-orange-600');
content = content.replace(/from-blue-500 to-blue-600/g, 'from-orange-500 to-orange-600');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed cost-of-living-slider colors');
