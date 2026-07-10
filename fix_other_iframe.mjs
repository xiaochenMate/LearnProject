import fs from 'fs';

let auth = fs.readFileSync('components/AuthUI.tsx', 'utf-8');
auth = auth.replace(
    /if \(confirm\("重新初始化身份将清空当前设备的本地收藏记录，确定吗？"\)\) \{/,
    `if (true) {`
);
fs.writeFileSync('components/AuthUI.tsx', auth);

let settings = fs.readFileSync('components/SettingsView.tsx', 'utf-8');
settings = settings.replace(
    /if \(confirm\("Are you sure you want to sign out\?"\)\) \{/,
    `if (true) {`
);
fs.writeFileSync('components/SettingsView.tsx', settings);

console.log("Other iframe API issues fixed");
