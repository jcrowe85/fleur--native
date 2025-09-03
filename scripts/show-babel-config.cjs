const { loadPartialConfig } = require('@babel/core');
const filename = process.argv[2] || 'app/index.tsx';
const cfg = loadPartialConfig({ filename });
if (!cfg) {
  console.error('No Babel config resolved.');
  process.exit(1);
}
console.log('Resolved config file:', cfg.babelrc || cfg.config || '(inline)');
console.log(JSON.stringify(cfg.options, null, 2));
