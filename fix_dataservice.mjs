import fs from 'fs';

let code = fs.readFileSync('lib/dataService.ts', 'utf-8');

code = code.replace(/catch \(error\) \{\n\s*console\.error\('\[DataService\] Neon Query Error:', error\);\n\s*throw error;\n\s*\}/g, `catch (error: any) {
      if (error && error.message && error.message.includes('relation') && error.message.includes('does not exist')) {
          return [] as unknown as T;
      }
      // console.error('[DataService] Neon Query Error:', error);
      throw error;
    }`);

fs.writeFileSync('lib/dataService.ts', code);
console.log("dataService updated");
