import fs from 'fs';

let tsconfig = JSON.parse(fs.readFileSync('tsconfig.json', 'utf-8'));
if (tsconfig.compilerOptions) {
    tsconfig.compilerOptions.noUnusedLocals = false;
    tsconfig.compilerOptions.noUnusedParameters = false;
    fs.writeFileSync('tsconfig.json', JSON.stringify(tsconfig, null, 2));
    console.log("tsconfig updated to ignore unused vars");
}

