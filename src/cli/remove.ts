import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import { loadRegistry, findUtility, UtilityMeta } from './registry';
import { getInstalledUtilities, isUtilityInstalled } from './add';

interface RemovalResult {
  utility: UtilityMeta;
  status: 'removed' | 'not_found' | 'not_installed' | 'failed';
  error?: string;
  path?: string;
}

export async function remove(utilityNames: string[]) {
  try {
    console.log(chalk.blue.bold('🗑️  Removing utilities from your project...'));
    console.log();

    const registry = await loadRegistry();
    const results: RemovalResult[] = [];
    
    const config = await getProjectConfig();
    if (!config) {
      console.error(chalk.red('❌ forge-utils not initialized in this project'));
      console.log(chalk.yellow('💡 Run "forge-utils init" first'));
      return;
    }

    const { valid, invalid, notInstalled } = await validateRemovalTargets(registry, utilityNames, config);
    
    if (invalid.length > 0) {
      console.error(chalk.red(`❌ Unknown utilities: ${chalk.bold(invalid.join(', '))}`));
      console.log(chalk.gray('💡 Use "forge-utils list --all" to see all available utilities'));
    }

    if (notInstalled.length > 0) {
      console.log(chalk.yellow(`⚠️  Not installed: ${chalk.bold(notInstalled.join(', '))}`));
    }

    if (valid.length === 0) {
      console.log(chalk.yellow('Nothing to remove.'));
      return;
    }

    if (valid.length > 1) {
      console.log(chalk.yellow(`About to remove ${valid.length} utilities:`));
      valid.forEach(name => {
        const utility = findUtility(registry, name)!;
        console.log(`  • ${chalk.cyan(name)} ${chalk.gray(`(${utility.category})`)}`);
      });
      console.log();
    }

    for (const utilityName of valid) {
      const utility = findUtility(registry, utilityName)!;
      const result = await removeUtility(utility, config);
      results.push(result);
    }

    await checkOrphanedDependencies(registry, config);

    displayRemovalSummary(results);
    
  } catch (error) {
    console.error(chalk.red('❌ Error removing utilities:'));
    console.error(chalk.gray(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

// Updated function signature to include config parameter
async function validateRemovalTargets(
  registry: any, 
  utilityNames: string[], 
  config: ProjectConfig
): Promise<{
  valid: string[];
  invalid: string[];
  notInstalled: string[];
}> {
  const valid: string[] = [];
  const invalid: string[] = [];
  const notInstalled: string[] = [];

  for (const name of utilityNames) {
    const utility = findUtility(registry, name);
    
    if (!utility) {
      invalid.push(name);
      continue;
    }

    // Use improved utility installation check
    const installed = await isUtilityInstalledImproved(utility, config);
    if (!installed) {
      notInstalled.push(name);
      continue;
    }

    valid.push(name);
  }

  return { valid, invalid, notInstalled };
}

// Improved utility installation check that handles file extensions properly
async function isUtilityInstalledImproved(utility: UtilityMeta, config: ProjectConfig): Promise<boolean> {
  try {
    // Generate both possible file names (TypeScript and JavaScript)
    const tsFileName = utility.file.replace(/\.js$/, '.ts');
    const jsFileName = utility.file.replace(/\.ts$/, '.js');
    
    const tsFilePath = path.join(config.rootPath, config.directory, tsFileName);
    const jsFilePath = path.join(config.rootPath, config.directory, jsFileName);
    
    // Check if either TypeScript or JavaScript version exists
    const tsExists = await fs.pathExists(tsFilePath);
    const jsExists = await fs.pathExists(jsFilePath);
    
    return tsExists || jsExists;
  } catch (error) {
    return false;
  }
}

interface ProjectConfig {
  typescript: boolean;
  directory: string;
  rootPath: string;
}

async function getProjectConfig(): Promise<ProjectConfig | null> {
  try {
    const configPath = path.join(process.cwd(), '.forge-utils.json');
    
    if (await fs.pathExists(configPath)) {
      const config = await fs.readJson(configPath);
      return {
        typescript: config.typescript || false,
        directory: config.directory || 'lib/utils',
        rootPath: process.cwd()
      };
    }

    const defaultUtilsPath = path.join(process.cwd(), 'lib/utils');
    if (await fs.pathExists(defaultUtilsPath)) {
      return {
        typescript: false,
        directory: 'lib/utils',
        rootPath: process.cwd()
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function removeUtility(
  utility: UtilityMeta, 
  config: ProjectConfig
): Promise<RemovalResult> {
  try {
    // Check for both TypeScript and JavaScript versions
    const tsFileName = utility.file.replace(/\.js$/, '.ts');
    const jsFileName = utility.file.replace(/\.ts$/, '.js');
    
    const tsFilePath = path.join(config.rootPath, config.directory, tsFileName);
    const jsFilePath = path.join(config.rootPath, config.directory, jsFileName);
    
    let targetFile: string | null = null;
    
    // Determine which file actually exists
    if (await fs.pathExists(tsFilePath)) {
      targetFile = tsFilePath;
    } else if (await fs.pathExists(jsFilePath)) {
      targetFile = jsFilePath;
    }

    if (!targetFile) {
      return {
        utility,
        status: 'not_installed',
        error: 'File not found'
      };
    }

    await fs.remove(targetFile);

    // Clean up empty category directory
    const categoryDir = path.join(config.rootPath, config.directory, utility.category);
    if (await fs.pathExists(categoryDir)) {
      const files = await fs.readdir(categoryDir);
      if (files.length === 0) {
        await fs.remove(categoryDir);
      }
    }

    return {
      utility,
      status: 'removed',
      path: targetFile
    };

  } catch (error) {
    return {
      utility,
      status: 'failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

async function checkOrphanedDependencies(registry: any, config: ProjectConfig): Promise<void> {
  try {
    const installedUtilities = await getInstalledUtilities();
    const stillUsedDependencies = new Set<string>();

    // Collect all dependencies that are still being used by remaining installed utilities
    for (const installedName of installedUtilities) {
      const utility = findUtility(registry, installedName);
      if (utility?.dependencies) {
        utility.dependencies.forEach(dep => stillUsedDependencies.add(dep));
      }
    }

    // Find installed utilities that are no longer needed as dependencies
    const orphanedDependencies: string[] = [];
    
    for (const installedName of installedUtilities) {
      const utility = findUtility(registry, installedName);
      if (utility) {
        // Check if this utility is a dependency that's no longer needed
        const isStillUsedAsDependency = stillUsedDependencies.has(installedName);
        const isDirectlyInstalled = installedUtilities.includes(installedName);
        
        // If it's not used as a dependency and was only installed as a dependency
        // (this would require tracking installation history, but for now we'll just suggest cleanup)
        if (!isStillUsedAsDependency) {
          // Check if any OTHER utilities depend on this one
          const isDependencyOfOthers = registry.utilities.some((otherUtility: UtilityMeta) => 
            otherUtility.name !== installedName && 
            otherUtility.dependencies?.includes(installedName) &&
            installedUtilities.includes(otherUtility.name)
          );
          
          if (!isDependencyOfOthers) {
            const potentialOrphan = installedName;

            const hasInstalledDependencies = utility.dependencies?.some(dep => 
              installedUtilities.includes(dep)
            );

            if (hasInstalledDependencies || utility.category === 'internal' || utility.name.includes('helper')) {
              orphanedDependencies.push(potentialOrphan);
            }
          }
        }
      }
    }

    if (orphanedDependencies.length > 0) {
      console.log();
      console.log(chalk.yellow('🧹 Potentially orphaned utilities detected:'));
      orphanedDependencies.forEach(dep => {
        const utility = findUtility(registry, dep);
        console.log(`   • ${chalk.gray(dep)} ${chalk.dim(`(${utility?.category || 'unknown'})`)}`);
      });
      console.log(chalk.gray('💡 These utilities might no longer be needed. Review and remove manually if unused:'));
      console.log(chalk.gray(`   forge-utils remove ${orphanedDependencies.join(' ')}`));
    }
  } catch (error) {
    // Silently handle error - orphan detection is not critical
  }
}

function displayRemovalSummary(results: RemovalResult[]): void {
  console.log();
  console.log(chalk.green.bold('📋 Removal Summary:'));
  console.log();

  const removed = results.filter(r => r.status === 'removed');
  const notFound = results.filter(r => r.status === 'not_found');
  const notInstalled = results.filter(r => r.status === 'not_installed');
  const failed = results.filter(r => r.status === 'failed');

  if (removed.length > 0) {
    console.log(chalk.green(`✅ Removed (${removed.length}):`));
    removed.forEach(result => {
      console.log(`   • ${chalk.cyan(result.utility.name)} ${chalk.gray(`from ${result.path}`)}`);
    });
  }

  if (notFound.length > 0) {
    console.log(chalk.yellow(`❓ Not found in registry (${notFound.length}):`));
    notFound.forEach(result => {
      console.log(`   • ${chalk.cyan(result.utility.name)}`);
    });
  }

  if (notInstalled.length > 0) {
    console.log(chalk.yellow(`⏭️  Not installed (${notInstalled.length}):`));
    notInstalled.forEach(result => {
      console.log(`   • ${chalk.cyan(result.utility.name)}`);
    });
  }

  if (failed.length > 0) {
    console.log(chalk.red(`❌ Failed (${failed.length}):`));
    failed.forEach(result => {
      console.log(`   • ${chalk.cyan(result.utility.name)} ${chalk.gray(`- ${result.error}`)}`);
    });
  }

  const total = results.length;
  const successful = removed.length;
  
  console.log();
  if (successful === total) {
    console.log(chalk.green(`🎉 Successfully removed ${successful}/${total} utilities!`));
  } else if (successful > 0) {
    console.log(chalk.yellow(`⚠️  Removed ${successful}/${total} utilities.`));
  } else {
    console.log(chalk.red(`❌ No utilities were removed.`));
  }
}

export async function removeAll(): Promise<void> {
  const installedUtilities = await getInstalledUtilities();
  
  if (installedUtilities.length === 0) {
    console.log(chalk.yellow('No utilities are currently installed.'));
    return;
  }

  console.log(chalk.yellow(`About to remove all ${installedUtilities.length} installed utilities:`));
  installedUtilities.forEach(name => {
    console.log(`  • ${chalk.cyan(name)}`);
  });
  console.log();

  await remove(installedUtilities);
}

export async function cleanEmptyDirectories(config: ProjectConfig): Promise<void> {
  try {
    const utilsDir = path.join(config.rootPath, config.directory);
    
    if (!await fs.pathExists(utilsDir)) {
      return;
    }

    const entries = await fs.readdir(utilsDir, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const dirPath = path.join(utilsDir, entry.name);
        const files = await fs.readdir(dirPath);
        
        if (files.length === 0) {
          await fs.remove(dirPath);
          console.log(chalk.gray(`🧹 Removed empty directory: ${entry.name}`));
        }
      }
    }
  } catch (error) {
    console.error(chalk.red('❌ Error cleaning empty directories:'));
    console.error(chalk.gray(error instanceof Error ? error.message : String(error)));
  }
}

export async function removeInteractive(utilityNames: string[]): Promise<void> {
  const registry = await loadRegistry();
  const config = await getProjectConfig();
  
  if (!config) {
    console.error(chalk.red('❌ forge-utils not initialized in this project'));
    return;
  }

  const toRemove: string[] = [];

  for (const name of utilityNames) {
    const utility = findUtility(registry, name);
    if (!utility) {
      console.log(chalk.red(`❌ Unknown utility: ${name}`));
      continue;
    }

    const installed = await isUtilityInstalledImproved(utility, config);
    if (!installed) {
      console.log(chalk.yellow(`⚠️  ${name} is not installed`));
      continue;
    }

    console.log();
    console.log(`${chalk.cyan.bold(utility.name)} ${chalk.gray(`(${utility.category})`)}`);
    if (utility.description) {
      console.log(chalk.gray(utility.description));
    }

    toRemove.push(name);
  }

  if (toRemove.length > 0) {
    await remove(toRemove);
  }
}
