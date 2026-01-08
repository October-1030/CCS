const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../data/skills/index.json');
const indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));

const categoryCount = {};
indexData.skills.forEach(skill => {
  const cat = skill.category || 'uncategorized';
  categoryCount[cat] = (categoryCount[cat] || 0) + 1;
});

console.log('\n📊 Current Category Distribution:\n');
Object.entries(categoryCount)
  .sort((a, b) => b[1] - a[1])
  .forEach(([category, count]) => {
    console.log(`${category.padEnd(25)} ${count} skills`);
  });

console.log(`\n✅ Total: ${indexData.totalSkills} skills across ${Object.keys(categoryCount).length} categories\n`);
