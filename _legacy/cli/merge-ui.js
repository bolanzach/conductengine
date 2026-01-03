/*

  Merges the built Svelte UI into the main.html file used by the Conduct server.

 */

const fs = require("fs");
const path = require("path");

// Paths
const svelteIndexPath = path.join(
  __dirname,
  "../src/conduct-ui/dist/index.html"
);
const mainHtmlPath = path.join(
  __dirname,
  "../src/conduct-core-client/main.html"
);
const outputPath = path.join(
  __dirname,
  "../dist/src/conduct-core-server/static/main.html"
);

// Read the Svelte built index.html
const svelteIndex = fs.readFileSync(svelteIndexPath, "utf-8");

// Extract script and link tags from Svelte build
const scriptMatches = svelteIndex.matchAll(
  /<script[^>]*src="([^"]+)"[^>]*><\/script>/g
);
const linkMatches = svelteIndex.matchAll(/<link[^>]*href="([^"]+)"[^>]*>/g);

const scripts = Array.from(scriptMatches).map((match) =>
  match[0].replace(/src="\/assets\//g, 'src="/static/assets/')
);
const links = Array.from(linkMatches).map((match) =>
  match[0].replace(/href="\/assets\//g, 'href="/static/assets/')
);

// Read main.html
let mainHtml = fs.readFileSync(mainHtmlPath, "utf-8");

// Inject the Svelte assets into main.html
// Add CSS links in the head
const headCloseTag = "</head>";
const cssLinks = links.join("\n  ");
mainHtml = mainHtml.replace(headCloseTag, `  ${cssLinks}\n${headCloseTag}`);

// Add scripts before the closing body tag, but before main.js
const mainJsScript = '<script src="/static/main.js"></script>';
const svelteScripts = scripts.join("\n");
mainHtml = mainHtml.replace(mainJsScript, `${svelteScripts}\n${mainJsScript}`);

// Ensure output directory exists
const outputDir = path.dirname(outputPath);
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Write the merged HTML
fs.writeFileSync(outputPath, mainHtml);

console.log(`✓ Successfully merged main.html ${outputDir}`);
