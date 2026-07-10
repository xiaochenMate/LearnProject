import fs from 'fs';
let code = fs.readFileSync('App.tsx', 'utf-8');
code = code.replace(
    /const lazyWithRetry = [\s\S]*?\}\);/m,
    `const lazyWithRetry = (componentImport: () => Promise<any>) =>
  lazy(async () => {
    const pageHasAlreadyBeenForceRefreshed = JSON.parse(
      sessionStorage.getItem('page-has-been-force-refreshed') || 'false'
    );
    try {
      const component = await componentImport();
      sessionStorage.setItem('page-has-been-force-refreshed', 'false');
      if (!component) {
        throw new Error("Import resolved to undefined");
      }
      return component;
    } catch (error) {
      if (!pageHasAlreadyBeenForceRefreshed) {
        sessionStorage.setItem('page-has-been-force-refreshed', 'true');
        window.location.reload();
        return new Promise(() => {});
      }
      throw error;
    }
  });`
);
fs.writeFileSync('App.tsx', code);
