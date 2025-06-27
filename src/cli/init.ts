import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';

interface InitOptions {
  typescript?: boolean;
  directory?: string;
}

export async function init(options: InitOptions): Promise<void> {
  const spinner = ora('Initializing forge-utils...').start();
  
  try {
    const cwd = process.cwd();
    const configPath = path.join(cwd, 'forge-utils.json');
    
    if (await fs.pathExists(configPath)) {
      spinner.warn(chalk.yellow('forge-utils is already initialized in this project'));
      return;
    }
    
    const config = {
      $schema: "https://forge-utils.dev/schema.json",
      typescript: options.typescript || false,
      directory: options.directory || 'lib/utils',
      utilities: [],
      version: require('../../package.json').version
    };
    
    const utilsDir = path.join(cwd, config.directory);
    await fs.ensureDir(utilsDir);
    
    await fs.writeJson(configPath, config, { spaces: 2 });
    
    const isTypeScript = config.typescript;
    const indexFile = `index.${isTypeScript ? 'ts' : 'js'}`;
    const indexPath = path.join(utilsDir, indexFile);
    
    const indexContent = isTypeScript 
      ? getTypescriptIndexTemplate()
      : getJavascriptIndexTemplate();
    
    await fs.writeFile(indexPath, indexContent);
    
    const readmePath = path.join(utilsDir, 'README.md');
    await fs.writeFile(readmePath, getReadmeTemplate());
    
    spinner.succeed(chalk.green('forge-utils initialized successfully!'));
    
    console.log(chalk.blue('\n✨ Next steps:'));
    console.log(chalk.gray(`   1. Run "${chalk.white('forge-utils list')}" to see available utilities`));
    console.log(chalk.gray(`   2. Run "${chalk.white('forge-utils add <utility-name>')}" to add utilities`));
    console.log(chalk.gray(`   3. Import utilities: ${chalk.white(`import { utilityName } from './${config.directory}'`)}`));
    
  } catch (error) {
    spinner.fail(chalk.red('Failed to initialize forge-utils'));
    console.error(chalk.red(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

function getTypescriptIndexTemplate(): string {
  return `// This file is managed by forge-utils
// You can edit these utilities to match your project needs

// Utilities will be exported here as you add them
// Example: export { dataURItoFile } from './dataURItoFile';

export {};
`;
}

function getJavascriptIndexTemplate(): string {
  return `// This file is managed by forge-utils
// You can edit these utilities to match your project needs

// Utilities will be exported here as you add them
// Example: module.exports = { dataURItoFile: require('./dataURItoFile') };

module.exports = {};
`;
}

function getReadmeTemplate(): string {
  return `# Forge Utils

This directory contains utility functions managed by forge-utils.

## Usage

\`\`\`javascript
import { utilityName } from './lib/utils';
\`\`\`

## Available Utilities

Run \`forge-utils list\` to see all available utilities.

## Adding Utilities

\`\`\`bash
forge-utils add utility-name
\`\`\`

## Customization

Feel free to modify any utility function to match your project's specific needs. The utilities are copied to your project, so you have full control over them.
`;
}