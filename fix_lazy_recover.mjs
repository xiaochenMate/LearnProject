import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf-8');

// The broken code starts with "// Resilient Lazy Loading for chunk errors"
// and ends right before "// Lazy load sub-apps"

code = code.replace(
    /\/\/ Resilient Lazy Loading for chunk errors[\s\S]*?\/\/ Lazy load sub-apps/,
    `// Resilient Lazy Loading for chunk errors
const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );

    try {
      const component = await componentImport();
      sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      
      if (!component || !component.default) {
         console.error("Component failed to load or has no default export", component);
         throw new Error("Module has no default export");
      }
      
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {}); // Wait for reload
      }
      throw error;
    }
  });

// Lazy load sub-apps`
);
fs.writeFileSync('App.tsx', code);
