#!/usr/bin/env node

import { program } from 'commander';
import chalk from 'chalk';
import { init } from './init';
import { add } from './add';
import { list } from './list';
import { remove } from './remove';

const packageJson = require('../../package.json');

program
  .name('forge-utils')
  .description('Add editable utility functions to your project')
  .version(packageJson.version);

program
  .command('init')
  .description('Initialize forge-utils in your project')
  .option('-t, --typescript', 'Use TypeScript')
  .option('-d, --directory <dir>', 'Installation directory', 'lib/utils')
  .action(init);

program
  .command('add <utilities...>')
  .description('Add utility functions to your project')
  .option('-o, --overwrite', 'Overwrite existing files')
  .action(add);

program
  .command('list')
  .description('List available utilities categories')
  .option('-c, --category <category...>', 'list all utilities in a category')
  .option('-a, --all', 'list categories and its utilities')
  .action(list);

program
  .command('remove <utilities...>')
  .description('Remove utility functions from your project')
  .action(remove);

program.on('command:*', () => {
  console.error(chalk.red(`Invalid command: ${program.args.join(' ')}`));
  console.log(chalk.yellow('Run "forge-utils --help" to see available commands'));
  process.exit(1);
});

if (!process.argv.slice(2).length) {
  program.outputHelp();
}

program.parse();
