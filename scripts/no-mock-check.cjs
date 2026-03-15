const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TARGETS = [
  path.join(ROOT, "src", "pages"),
  path.join(ROOT, "src", "components", "dashboard"),
];

const FORBIDDEN_RULES = [
  {
    pattern: /mockDataService/g,
    message: "mockDataService import/use is not allowed in production UI paths.",
  },
  {
    pattern: /Math\.random\(/g,
    message: "Math.random() is not allowed for production market/UI data.",
  },
  {
    pattern: /paperPortfolio/g,
    message: "Legacy localStorage paperPortfolio mock state is not allowed.",
  },
  {
    pattern: /Mock news data/g,
    message: "Mock news placeholders are not allowed.",
  },
];

const isTsFile = (filePath) => filePath.endsWith(".ts") || filePath.endsWith(".tsx");

const walk = (dirPath) => {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (entry.isFile() && isTsFile(fullPath)) {
      files.push(fullPath);
    }
  }
  return files;
};

const toRel = (fullPath) => path.relative(ROOT, fullPath).replace(/\\/g, "/");

const issues = [];
for (const target of TARGETS) {
  if (!fs.existsSync(target)) continue;
  const files = walk(target);
  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf8");
    for (const rule of FORBIDDEN_RULES) {
      const matches = source.match(rule.pattern);
      if (matches && matches.length > 0) {
        issues.push({
          file: toRel(filePath),
          count: matches.length,
          message: rule.message,
        });
      }
    }
  }
}

if (issues.length > 0) {
  console.error("No-mock check failed.");
  for (const issue of issues) {
    console.error(`- ${issue.file}: ${issue.message} (${issue.count} match(es))`);
  }
  process.exit(1);
}

console.log("No-mock check passed.");
