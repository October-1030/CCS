const indexData = require('../data/skills/index.json');
const data = indexData.skills;

const invalid = data.filter(s =>
  typeof s.name !== 'string' ||
  typeof s.description !== 'string' ||
  (typeof s.name === 'object' && s.name !== null) ||
  (typeof s.description === 'object' && s.description !== null)
);

console.log('Total skills:', data.length);
console.log('Invalid skills:', invalid.length);

if (invalid.length > 0) {
  console.log('\nFirst 10 invalid skills:');
  invalid.slice(0, 10).forEach(s => {
    console.log('---');
    console.log('ID:', s.id);
    console.log('Name:', typeof s.name === 'object' ? JSON.stringify(s.name) : s.name);
    console.log('Description:', typeof s.description === 'object' ? JSON.stringify(s.description).substring(0, 100) : s.description.substring(0, 100));
  });
}
