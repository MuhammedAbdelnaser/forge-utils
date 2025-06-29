import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import * as ts from 'typescript';
import { loadRegistry, findUtility, UtilityMeta, searchUtilities } from './registry';

interface AddOptions {
  overwrite?: boolean;
  noDeps?: boolean;
}

interface InstallationResult {
  utility: UtilityMeta;
  status: 'installed' | 'skipped' | 'overwritten' | 'failed';
  error?: string;
  path?: string;
  isDependency?: boolean;
}

interface DependencyMap {
  [key: string]: Set<string>;
}

interface ProjectConfig {
  typescript: boolean;
  directory: string;
  rootPath: string;
  utilsPath?: string;
}

export async function add(utilityNames: string[], options: AddOptions = {}) {
  try {
    console.log(chalk.blue.bold('🔧 Adding utilities to your project...'));
    console.log();

    const registry = await loadRegistry();
    const results: InstallationResult[] = [];

    const expandedUtilityNames = await expandCategoryNames(registry, utilityNames);
    
    
    const { valid, invalid, suggestions } = await validateUtilities(registry, expandedUtilityNames);
    
    if (invalid.length > 0) {
      console.error(chalk.red(`❌ Unknown utilities: ${chalk.bold(invalid.join(', '))}`));
      
      if (suggestions.length > 0) {
        console.log(chalk.yellow('💡 Did you mean:'));
        suggestions.forEach(suggestion => {
          console.log(`   • ${chalk.cyan(suggestion.name)} ${chalk.gray(`(${suggestion.category})`)}`);
          if (suggestion.description) {
            console.log(`     ${chalk.gray(suggestion.description)}`);
          }
        });
      }
      
      console.log();
      console.log(chalk.gray('💡 Use "forge-utils list --all" to see all available utilities'));
      return;
    }

    const config = await getProjectConfig();
    if (!config) {
      console.error(chalk.red('❌ forge-utils not initialized in this project'));
      console.log(chalk.yellow('💡 Run "forge-utils init" first'));
      return;
    }

    const { toInstall, dependencyMap } = await resolveDependencies(registry, valid, options.noDeps);
    
    if (!options.noDeps && toInstall.length > valid.length) {
      console.log(chalk.yellow('📦 Dependencies detected:'));
      valid.forEach(utilityName => {
        const deps = dependencyMap[utilityName];
        if (deps && deps.size > 0) {
          console.log(`   ${chalk.cyan(utilityName)} requires: ${Array.from(deps).map(d => chalk.gray(d)).join(', ')}`);
        }
      });
      console.log();
    }

    for (const utilityName of toInstall) {
      const utility = findUtility(registry, utilityName)!;
      const isDependency = !valid.includes(utilityName);
      const result = await installUtility(utility, config, options);
      result.isDependency = isDependency;
      results.push(result);
    }

    await displayInstallationSummary(results);
    
  } catch (error) {
    console.error(chalk.red('❌ Error adding utilities:'));
    console.error(chalk.gray(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function expandCategoryNames(registry: any, utilityNames: string[]): Promise<string[]> {
  const expanded: string[] = [];
  if (utilityNames.length === 0) {
    console.log(chalk.yellow('⚠️ No utilities specified, listing all available categories'));
    return registry.utilities.map((u: UtilityMeta) => u.category);
  }
  console.log(chalk.blue.bold('🔍 Expanding utility names...'));
  console.log(chalk.gray(`   Input utilities: ${utilityNames.join(', ')}`));
  console.log();

  const categories = [...new Set(registry.utilities.map((u: UtilityMeta) => u.category))];
  
  for (const name of utilityNames) {
    if (categories.includes(name)) {
      console.log(chalk.blue(`📂 Expanding category: ${chalk.bold(name)}`));

      const categoryUtilities = registry.utilities
        .filter((u: UtilityMeta) => u.category === name)
        .map((u: UtilityMeta) => u.name);
      
      console.log(chalk.gray(`   Found ${categoryUtilities.length} utilities: ${categoryUtilities.join(', ')}`));
      console.log();
      
      expanded.push(...categoryUtilities);
    } else {
      expanded.push(name);
    }
  }
  
  return expanded;
}

async function resolveDependencies(
  registry: any, 
  utilityNames: string[], 
  noDeps: boolean = false
): Promise<{ toInstall: string[], dependencyMap: DependencyMap }> {
  const dependencyMap: DependencyMap = {};
  const visited = new Set<string>();
  const toInstall: string[] = [];
  
  function collectDependencies(utilityName: string): string[] {
    if (visited.has(utilityName)) {
      return [];
    }
    
    visited.add(utilityName);
    const utility = findUtility(registry, utilityName);
    
    if (!utility) {
      throw new Error(`Utility "${utilityName}" not found in registry`);
    }
    
    const dependencies = utility.dependencies || [];
    const allDeps = new Set<string>();
    
    dependencies.forEach((dep: string) => allDeps.add(dep));
    
    if (!noDeps) {
      dependencies.forEach((dep: string) => {
        const transitiveDeps = collectDependencies(dep);
        transitiveDeps.forEach(transitiveDep => allDeps.add(transitiveDep));
      });
    }
    
    dependencyMap[utilityName] = allDeps;
    return Array.from(allDeps);
  }
  
  const allDependencies = new Set<string>();
  
  for (const utilityName of utilityNames) {
    const deps = collectDependencies(utilityName);
    deps.forEach(dep => allDependencies.add(dep));
  }
  
  const orderedInstallation = topologicalSort(registry, [...allDependencies, ...utilityNames]);
  
  return {
    toInstall: orderedInstallation,
    dependencyMap
  };
}

function topologicalSort(registry: any, utilities: string[]): string[] {
  const visited = new Set<string>();
  const visiting = new Set<string>();
  const result: string[] = [];
  
  function visit(utilityName: string) {
    if (visiting.has(utilityName)) {
      throw new Error(`Circular dependency detected involving "${utilityName}"`);
    }
    
    if (visited.has(utilityName)) {
      return;
    }
    
    visiting.add(utilityName);
    
    const utility = findUtility(registry, utilityName);
    if (utility && utility.dependencies) {
      for (const dep of utility.dependencies) {
        if (utilities.includes(dep)) {
          visit(dep);
        }
      }
    }
    
    visiting.delete(utilityName);
    visited.add(utilityName);
    result.push(utilityName);
  }
  
  const uniqueUtilities = [...new Set(utilities)];
  
  for (const utility of uniqueUtilities) {
    visit(utility);
  }
  
  return result;
}

async function validateUtilities(registry: any, utilityNames: string[]): Promise<{
  valid: string[];
  invalid: string[];
  suggestions: UtilityMeta[];
}> {
  const valid: string[] = [];
  const invalid: string[] = [];
  const suggestions: UtilityMeta[] = [];

  for (const name of utilityNames) {
    const utility = findUtility(registry, name);
    if (utility) {
      valid.push(name);
    } else {
      invalid.push(name);
      
      const similar = searchUtilities(registry, name, { limit: 3 });
      suggestions.push(...similar);
    }
  }

  const uniqueSuggestions = suggestions.filter((suggestion, index, arr) => 
    arr.findIndex(s => s.name === suggestion.name) === index
  );

  return { valid, invalid, suggestions: uniqueSuggestions };
}

async function installUtility(
  utility: UtilityMeta, 
  config: ProjectConfig, 
  options: AddOptions
): Promise<InstallationResult> {
  try {
  
    let fileName: string;
    
    if (config.typescript) {
      fileName = utility.file.replace(/\.(js|ts)$/, '.ts');
    } else {
      fileName = utility.file.replace(/\.(js|ts)$/, '.js');
    }
    
    const targetFile = path.join(config.rootPath, config.directory, fileName);

  
    if (await fs.pathExists(targetFile)) {
      if (!options.overwrite) {
        return {
          utility,
          status: 'skipped',
          path: targetFile
        };
      }
    }

  
    let content: string;
    try {
      content = await getUtilityContent(utility);
    } catch (error) {
      return {
        utility,
        status: 'failed',
        error: `Source file not found: ${utility.file}`
      };
    }

  
    if (!config.typescript && isTypeScriptContent(content)) {
      content = await transformTypeScriptToJavaScript(content);
    } else if (config.typescript && !isTypeScriptContent(content)) {
      content = addBasicTypeAnnotations(content);
    }

  
    await fs.ensureDir(path.dirname(targetFile));
    
  
    await fs.writeFile(targetFile, content, 'utf8');

    const status = (await fs.pathExists(targetFile) && options.overwrite) ? 'overwritten' : 'installed';

    return {
      utility,
      status,
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

function isTypeScriptContent(content: string): boolean {
  const tsPatterns = [
    /:\s*[A-Za-z<>[\]{}|&\s,]+(?=\s*[=;,)\]])/,
    /interface\s+\w+/,                       
    /type\s+\w+\s*=/,                       
    /import\s+type\s/,                      
    /<[^>]+>/,                              
    /\w+\?\s*:/,                            
    /\bas\s+\w+/                            
  ];
  
  return tsPatterns.some(pattern => pattern.test(content));
}
function addBasicTypeAnnotations(content: string): string {
  const typeAnnotation = ': any';
  
  content = content.replace(/(\w+)\s*=\s*[^;]+;/g, `$1${typeAnnotation};`);
  content = content.replace(/(\w+)\s*:\s*[^,)=\n]+(?=[,)=])/g, `$1${typeAnnotation}`);
  content = content.replace(/(\w+)\s*:\s*[^=;,)\n]+(?=[=;,)])/g, `$1${typeAnnotation}`);
  
  return content;
}

async function getProjectConfig(): Promise<ProjectConfig | null> {
  try {
    const newConfigPath = path.join(process.cwd(), '.forge-utils.json');
    if (await fs.pathExists(newConfigPath)) {
      const config = await fs.readJson(newConfigPath);
      return {
        typescript: config.typescript || false,
        directory: config.directory || 'lib/utils',
        rootPath: process.cwd(),
        utilsPath: path.join(process.cwd(), config.directory || 'lib/utils')
      };
    }

    const oldConfigPath = path.join(process.cwd(), 'forge-utils.config.json');
    if (await fs.pathExists(oldConfigPath)) {
      const config = await fs.readJson(oldConfigPath);
      return {
        typescript: true,
        directory: config.utilsPath || 'lib/utils',
        rootPath: process.cwd(),
        utilsPath: path.join(process.cwd(), config.utilsPath || 'lib/utils')
      };
    }

  
    const hasTypeScript = await detectTypeScriptProject();
    
    const defaultUtilsPath = path.join(process.cwd(), 'lib/utils');
    if (await fs.pathExists(defaultUtilsPath)) {
      return {
        typescript: hasTypeScript,
        directory: 'lib/utils',
        rootPath: process.cwd(),
        utilsPath: defaultUtilsPath
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

async function detectTypeScriptProject(): Promise<boolean> {
  const tsIndicators = [
    'tsconfig.json',
    'tsconfig.*.json',
    'src/types.ts',
    'src/index.ts'
  ];
  
  for (const indicator of tsIndicators) {
    if (await fs.pathExists(path.join(process.cwd(), indicator))) {
      return true;
    }
  }
  

  const packageJsonPath = path.join(process.cwd(), 'package.json');
  if (await fs.pathExists(packageJsonPath)) {
    try {
      const packageJson = await fs.readJson(packageJsonPath);
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies
      };
      
      return !!(deps.typescript || deps['@types/node'] || deps['ts-node']);
    } catch {}
  }
  
  return false;
}

async function getUtilityContent(utility: UtilityMeta): Promise<string> {
  async function tryReadFile(basePath: string, fileName: string): Promise<string | null> {
    const possibleExtensions = ['.ts', '.js'];
    const baseFileName = fileName.replace(/\.(ts|js)$/, '');
    
    for (const ext of possibleExtensions) {
      const fullPath = path.join(basePath, baseFileName + ext);
      if (await fs.pathExists(fullPath)) {
        return await fs.readFile(fullPath, 'utf8');
      }
    }
    return null;
  }

  const sourceBasePath = path.join(__dirname, '..', '..', 'src', 'utils', utility.category);
  let content = await tryReadFile(sourceBasePath, utility.file);
  
  if (content) {
    return content;
  }

  const categoryBasePath = path.join(__dirname, '..', 'utils', utility.category);
  content = await tryReadFile(categoryBasePath, utility.file);
  
  if (content) {
    return content;
  }
  
  const flatBasePath = path.join(__dirname, '..', 'utils');
  content = await tryReadFile(flatBasePath, utility.file);
  
  if (content) {
    return content;
  }
  
  const templateBasePath = path.join(__dirname, '..', 'registry', 'templates');
  content = await tryReadFile(templateBasePath, utility.file);
  
  if (content) {
    return content;
  }
  
  throw new Error(`Template file not found for utility: ${utility.name} (${utility.file})`);
}

async function transformTypeScriptToJavaScript(content: string): Promise<string> {
  try {
    const result = ts.transpileModule(content, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2020,
        module: ts.ModuleKind.ES2020,
        moduleResolution: ts.ModuleResolutionKind.Node10,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        strict: false,
        skipLibCheck: true,
        removeComments: false,
      }
    });

    return result.outputText;
  } catch (error) {
    console.warn('TypeScript compiler transformation failed, falling back to regex-based transformation');
    return fallbackTransform(content);
  }
}

function fallbackTransform(content: string): string {
  let jsContent = content;

  jsContent = jsContent.replace(/import\s+type\s+\{[^}]*\}\s+from\s+['"][^'"]*['"];?\n?/g, '');
  
  jsContent = jsContent.replace(/export\s+interface\s+\w+\s*\{[^}]*\}/gs, '');
  jsContent = jsContent.replace(/interface\s+\w+\s*\{[^}]*\}/gs, '');
  
  jsContent = jsContent.replace(/export\s+type\s+\w+\s*=\s*[^;]+;/g, '');
  jsContent = jsContent.replace(/type\s+\w+\s*=\s*[^;]+;/g, '');
  
  jsContent = jsContent.replace(/(\w+)\s*:\s*[^,)=\n]+(?=[,)=])/g, '$1');
  
  jsContent = jsContent.replace(/\):\s*[^{=\n]+(?=[{=])/g, ')');
  
  jsContent = jsContent.replace(/(\w+)\s*:\s*[^=;,)\n]+(?=[=;,)])/g, '$1');
  
  jsContent = jsContent.replace(/<[^>]*>/g, '');
  
  jsContent = jsContent.replace(/\s+as\s+[^;,)}\]\n]+/g, '');
  
  jsContent = jsContent.replace(/(\w+)\?\s*(?=[:=])/g, '$1');
  
  jsContent = jsContent.replace(/export\s+type\s+/g, 'export ');
  
  jsContent = jsContent.replace(/\b(public|private|protected|readonly)\s+/g, '');
  
  jsContent = jsContent.replace(/\n\s*\n\s*\n/g, '\n\n');
  jsContent = jsContent.replace(/\s+$/gm, '');
  
  return jsContent;
}

async function displayInstallationSummary(results: InstallationResult[]) {
  console.log();
  
  const installed = results.filter(r => r.status === 'installed');
  const overwritten = results.filter(r => r.status === 'overwritten');
  const skipped = results.filter(r => r.status === 'skipped');
  const failed = results.filter(r => r.status === 'failed');
  const dependencies = results.filter(r => r.isDependency);
  const primary = results.filter(r => !r.isDependency);
  
  if (primary.length > 0) {
    console.log(chalk.green.bold('✅ Primary utilities:'));
    primary.forEach(result => {
      const icon = result.status === 'installed' ? '📦' : 
                  result.status === 'overwritten' ? '🔄' : 
                  result.status === 'skipped' ? '⏭️' : '❌';
      
      console.log(`   ${icon} ${chalk.cyan(result.utility.name)} ${chalk.gray(`(${result.status})`)}`);
      if (result.path) {
        console.log(`      ${chalk.gray(result.path)}`);
      }
      if (result.error) {
        console.log(`      ${chalk.red(result.error)}`);
      }
    });
    console.log();
  }
  
  if (dependencies.length > 0) {
    console.log(chalk.yellow.bold('📦 Dependencies:'));
    dependencies.forEach(result => {
      const icon = result.status === 'installed' ? '📦' : 
                  result.status === 'overwritten' ? '🔄' : 
                  result.status === 'skipped' ? '⏭️' : '❌';
      
      console.log(`   ${icon} ${chalk.gray(result.utility.name)} ${chalk.gray(`(${result.status})`)}`);
      if (result.path) {
        console.log(`      ${chalk.gray(result.path)}`);
      }
    });
    console.log();
  }
  
  const totalInstalled = installed.length;
  const totalOverwritten = overwritten.length;
  const totalSkipped = skipped.length;
  const totalFailed = failed.length;
  
  if (totalInstalled > 0) {
    console.log(chalk.green(`✅ ${totalInstalled} utility${totalInstalled !== 1 ? 'ies' : ''} installed`));
  }
  
  if (totalOverwritten > 0) {
    console.log(chalk.yellow(`🔄 ${totalOverwritten} utility${totalOverwritten !== 1 ? 'ies' : ''} overwritten`));
  }
  
  if (totalSkipped > 0) {
    console.log(chalk.blue(`⏭️  ${totalSkipped} utility${totalSkipped !== 1 ? 'ies' : ''} skipped (already exists)`));
    console.log(chalk.gray('   Use --overwrite to replace existing files'));
  }
  
  if (totalFailed > 0) {
    console.log(chalk.red(`❌ ${totalFailed} utility${totalFailed !== 1 ? 'ies' : ''} failed to install`));
  }
  
  console.log();
  
  if (totalInstalled > 0 || totalOverwritten > 0) {
    console.log(chalk.blue.bold('💡 Usage examples:'));
    const successfulResults = results.filter(r => 
      (r.status === 'installed' || r.status === 'overwritten') && !r.isDependency
    );
    
    successfulResults.slice(0, 3).forEach(result => {
      console.log(`   ${chalk.cyan(`import { ${result.utility.name} } from './utils/${result.utility.name}';`)}`);
    });
    
    if (successfulResults.length > 3) {
      console.log(`   ${chalk.gray(`... and ${successfulResults.length - 3} more`)}`);
    }
  }
}

export async function isUtilityInstalled(utilityName: string): Promise<boolean> {
  try {
    const config = await getProjectConfig();
    if (!config) return false;

    const registry = await loadRegistry();
    const utility = findUtility(registry, utilityName);
    if (!utility) return false;

    const fileName = config.typescript 
      ? utility.file.replace(/\.js$/, '.ts')
      : utility.file.replace(/\.ts$/, '.js');
    
    const targetFile = path.join(config.rootPath, config.directory, fileName);
    return await fs.pathExists(targetFile);
  } catch {
    return false;
  }
}

export async function getInstalledUtilities(): Promise<string[]> {
  try {
    const config = await getProjectConfig();
    if (!config) return [];

    const registry = await loadRegistry();
    const installed: string[] = [];

    for (const utility of registry.utilities) {
      if (await isUtilityInstalled(utility.name)) {
        installed.push(utility.name);
      }
    }

    return installed;
  } catch {
    return [];
  }
}
