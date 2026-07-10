import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf-8');
code = code.replace(
    /return window\.location\.reload\(\);/,
    `window.location.reload();\n        return new Promise(() => {}); // Wait for reload`
);
fs.writeFileSync('App.tsx', code);
console.log("lazyWithRetry fixed");
