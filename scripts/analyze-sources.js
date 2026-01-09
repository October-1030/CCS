const data = require('../data/skills/index.json');

const repoCount = {};
data.skills.forEach(s => {
  const repo = s.repoUrl.split('/').slice(3,5).join('/');
  repoCount[repo] = (repoCount[repo] || 0) + 1;
});

console.log('📊 Skills 来源分布（前 20 名）:\n');
Object.entries(repoCount)
  .sort((a,b) => b[1] - a[1])
  .slice(0, 20)
  .forEach(([repo, count], i) => {
    console.log(`${(i+1).toString().padStart(2)}. ${repo.padEnd(55)} ${count} skills`);
  });

console.log(`\n✅ 总计: ${data.totalSkills} skills 来自 ${Object.keys(repoCount).length} 个不同的仓库`);
