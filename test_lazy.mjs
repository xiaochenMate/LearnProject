import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf-8');
code = code.replace(
    /return window\.location\.reload\(\);/,
    `console.error("Dynamic import error:", error);\n        window.location.reload();\n        return new Promise(() => {});`
);
fs.writeFileSync('App.tsx', code);
