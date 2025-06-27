import chalk from 'chalk';
import { loadRegistry, Registry, Category, UtilityMeta, getUtilitiesByCategory } from './registry';

interface ListOptions {
  category?: string[];
  all?: boolean;
}

export async function list(options: ListOptions = {}) {
  try {
    const registry = await loadRegistry();
    
    if (options.all && options.category) {
      console.log(chalk.yellow('⚠️  Both --all and --category options provided. Using --all and ignoring --category.'));
      return await listAllCategoriesAndUtilities(registry);
    }
    
    if (options.all) {
      return await listAllCategoriesAndUtilities(registry);
    }
    
    if (options.category) {
      return await listUtilitiesByCategory(registry, options.category);
    }
    
    return await listCategories(registry);
    
  } catch (error) {
    console.error(chalk.red('❌ Error loading utilities registry:'));
    console.error(chalk.gray(error instanceof Error ? error.message : String(error)));
    process.exit(1);
  }
}

async function listCategories(registry: Registry) {
  console.log(chalk.blue.bold('📋 Available Utility Categories:'));
  console.log();
  
  if (registry.categories.length === 0) {
    console.log(chalk.yellow('No utility categories found.'));
    return;
  }
  
  registry.categories.forEach((category: Category) => {
    const utilities = getUtilitiesByCategory(registry, category.name);
    const utilityCount = utilities.length;
    
    console.log(`${chalk.green(category.icon || '▶')} ${chalk.cyan.bold(category.name)} ${chalk.gray(`(${utilityCount} utilities)`)}`);
    if (category.description) {
      console.log(`   ${chalk.gray(category.description)}`);
    }
  });
  
  console.log();
  console.log(chalk.gray('💡 Use "forge-utils list --all" to see all utilities'));
  console.log(chalk.gray('💡 Use "forge-utils list --category <name>" to see utilities in a specific category'));
}

async function listAllCategoriesAndUtilities(registry: Registry) {
  console.log(chalk.blue.bold('📋 All Categories and Utilities:'));
  console.log();
  
  if (registry.categories.length === 0) {
    console.log(chalk.yellow('No utility categories found.'));
    return;
  }
  
  registry.categories.forEach((category: Category, index: number) => {
    const utilities = getUtilitiesByCategory(registry, category.name);
    
    console.log(`${chalk.green.bold(`${category.icon || '▶'} ${category.name}`)} ${chalk.gray(`(${utilities.length} utilities)`)}`);
    if (category.description) {
      console.log(chalk.gray(`   ${category.description}`));
    }
    
    if (utilities.length === 0) {
      console.log(chalk.gray('   └── No utilities available'));
    } else {
      utilities.forEach((utility: UtilityMeta, utilIndex: number) => {
        const isLast = utilIndex === utilities.length - 1;
        const prefix = isLast ? '   └──' : '   ├──';
        
        console.log(`${chalk.gray(prefix)} ${chalk.cyan(utility.name)}`);
        if (utility.description) {
          console.log(`${chalk.gray('   ' + (isLast ? '    ' : '│   '))} ${chalk.gray(utility.description)}`);
        }
      });
    }
    
    if (index < registry.categories.length - 1) {
      console.log();
    }
  });
}

async function listUtilitiesByCategory(registry: Registry, categoryNames: string[]) {
  const validCategories = categoryNames.filter(cat => cat && cat.trim() !== '');
  
  if (validCategories.length === 0) {
    console.error(chalk.red('❌ No valid category names provided.'));
    console.log(chalk.yellow('💡 Use "forge-utils list" to see available categories'));
    return;
  }
  
  const availableCategories = registry.categories.map(cat => cat.name);
  const foundCategories: string[] = [];
  const notFoundCategories: string[] = [];
  
  validCategories.forEach(categoryName => {
    if (availableCategories.includes(categoryName)) {
      foundCategories.push(categoryName);
    } else {
      notFoundCategories.push(categoryName);
    }
  });
  
  if (foundCategories.length > 0) {
    console.log(chalk.blue.bold('📋 Utilities by Category:'));
    console.log();
    
    foundCategories.forEach((categoryName, index) => {
      const category = registry.categories.find(cat => cat.name === categoryName);
      const utilities = getUtilitiesByCategory(registry, categoryName);
      
      console.log(`${chalk.green.bold(`${category?.icon || '▶'} ${categoryName}`)} ${chalk.gray(`(${utilities.length} utilities)`)}`);
      if (category?.description) {
        console.log(chalk.gray(`   ${category.description}`));
      }
      
      if (utilities.length === 0) {
        console.log(chalk.gray('   └── No utilities available'));
      } else {
        utilities.forEach((utility: UtilityMeta, utilIndex: number) => {
          const isLast = utilIndex === utilities.length - 1;
          const prefix = isLast ? '   └──' : '   ├──';
          
          console.log(`${chalk.gray(prefix)} ${chalk.cyan.bold(utility.name)}`);
          
          if (utility.description) {
            console.log(`${chalk.gray('   ' + (isLast ? '    ' : '│   '))} ${chalk.gray(utility.description)}`);
          }
          
          if (utility.file) {
            console.log(`${chalk.gray('   ' + (isLast ? '    ' : '│   '))} ${chalk.dim(`File: ${utility.file}`)}`);
          }
          
          if (utility.dependencies && utility.dependencies.length > 0) {
            const depStr = utility.dependencies.join(', ');
            console.log(`${chalk.gray('   ' + (isLast ? '    ' : '│   '))} ${chalk.yellow(`Dependencies: ${depStr}`)}`);
          }
        });
      }
      
      if (index < foundCategories.length - 1) {
        console.log();
      }
    });
  }
  
  if (notFoundCategories.length > 0) {
    if (foundCategories.length > 0) {
      console.log();
    }
    
    console.error(chalk.red(`❌ Categor${notFoundCategories.length > 1 ? 'ies' : 'y'} not found: ${chalk.bold(notFoundCategories.join(', '))}`));
    
    const suggestions = suggestSimilarCategories(notFoundCategories, availableCategories);
    if (suggestions.length > 0) {
      console.log(chalk.yellow('💡 Did you mean:'));
      suggestions.forEach(suggestion => {
        const category = registry.categories.find(cat => cat.name === suggestion);
        console.log(`   ${chalk.cyan(`• ${suggestion}`)} ${chalk.gray(category?.description ? `- ${category.description}` : '')}`);
      });
    }
    
    console.log();
    console.log(chalk.gray('💡 Use "forge-utils list" to see all available categories'));
  }
}

function suggestSimilarCategories(notFound: string[], available: string[]): string[] {
  const suggestions: string[] = [];
  
  notFound.forEach(category => {
    const lower = category.toLowerCase();
    
    const exactMatches = available.filter(avail => {
      const availLower = avail.toLowerCase();
      return availLower.includes(lower) || lower.includes(availLower);
    });
    
    const prefixMatches = available.filter(avail => {
      const availLower = avail.toLowerCase();
      return availLower.startsWith(lower.substring(0, Math.min(3, lower.length))) ||
             lower.startsWith(availLower.substring(0, Math.min(3, availLower.length)));
    });
    
    const allMatches = [...new Set([...exactMatches, ...prefixMatches])];
    suggestions.push(...allMatches);
  });
  
  return [...new Set(suggestions)].slice(0, 3);
}

export function getCategoryStats(registry: Registry): { name: string, count: number, icon?: string }[] {
  return registry.categories.map(category => ({
    name: category.name,
    count: getUtilitiesByCategory(registry, category.name).length,
    icon: category.icon
  }));
}

export function validateCategoryNames(registry: Registry, categoryNames: string[]): {
  valid: string[];
  invalid: string[];
  suggestions: string[];
} {
  const availableCategories = registry.categories.map(cat => cat.name);
  const valid: string[] = [];
  const invalid: string[] = [];
  
  categoryNames.forEach(name => {
    if (availableCategories.includes(name)) {
      valid.push(name);
    } else {
      invalid.push(name);
    }
  });
  
  const suggestions = invalid.length > 0 
    ? suggestSimilarCategories(invalid, availableCategories)
    : [];
  
  return { valid, invalid, suggestions };
}
