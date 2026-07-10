const fs = require('fs');
const glob = require('glob'); // Not available? We can just use fs.readdirSync
const path = require('path');

const files = fs.readdirSync('components').filter(f => f.endsWith('App.tsx') || f === 'Earth3D.tsx');
console.log(files);
