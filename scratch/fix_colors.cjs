const fs = require('fs');
const path = require('path');

const filesToFix = [
  'src/app/components/daily-drill-widget.tsx',
  'src/app/components/live-alumni-feed.tsx',
  'src/app/components/support-hub.tsx'
];

filesToFix.forEach(relPath => {
  const fullPath = path.join('d:/TheGlobalAvenues-CRM', relPath);
  if (fs.existsSync(fullPath)) {
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Replace daily drill & general colors
    content = content.replace(/#001F3F/g, '#1A0A00');
    content = content.replace(/#003D7A/g, '#2D1200');
    content = content.replace(/#0074D9/g, '#FD7E14');
    
    // Replace pink/purple in alumni feed
    content = content.replace(/pink-500/g, 'orange-500');
    content = content.replace(/pink-600/g, 'orange-600');
    content = content.replace(/purple-500/g, 'red-500');
    
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log('Fixed', relPath);
  } else {
    console.log('Not found', relPath);
  }
});
