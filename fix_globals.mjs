import fs from 'fs';

let code = fs.readFileSync('src/main.tsx', 'utf-8');

const injection = `
// Override alert and confirm for iframe compatibility
window.alert = (msg) => {
  console.log('ALERT:', msg);
};
window.confirm = (msg) => {
  console.log('CONFIRM:', msg);
  return true; // Always accept in iframe context
};
`;

if (!code.includes('window.alert =')) {
    code = code.replace(/import '\.\/index\.css';/, "import './index.css';\n" + injection);
    fs.writeFileSync('src/main.tsx', code);
}
console.log("Globals fixed");
