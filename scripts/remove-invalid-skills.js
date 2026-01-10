const fs = require('fs');
const path = require('path');

const skillsFullPath = path.join(__dirname, '../data/skills/skills-full.json');
const skillsFull = require(skillsFullPath);

const invalidIds = [
  'jezweb-claude-skills-skill-skeleton',
  'wogi-git-wogi-flow-_template'
];

console.log('Before:', Object.keys(skillsFull).length, 'skills');

invalidIds.forEach(id => {
  if (skillsFull[id]) {
    delete skillsFull[id];
    console.log('Removed:', id);
  } else {
    console.log('Not found:', id);
  }
});

console.log('After:', Object.keys(skillsFull).length, 'skills');

fs.writeFileSync(skillsFullPath, JSON.stringify(skillsFull, null, 2));
console.log('File updated!');
