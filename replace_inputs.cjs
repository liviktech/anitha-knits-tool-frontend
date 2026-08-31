const fs = require('fs');
const files = ['src/features/production/extruder-modal-form.tsx', 
  'src/features/production/loom-modal-form.tsx',
  'src/features/production/fabric-modal-form.tsx',
  'src/features/inventory/fabric-delivered-modal-form.tsx'
];
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/<Input\s+type="number"/g, `<Input type="number" min="0" onKeyDown={(e) => e.key === '-' && e.preventDefault()}`);
  fs.writeFileSync(file, content);
});
