import fs from 'fs-extra';
import path from 'path';

export interface UtilityMeta {
  name: string;
  category: string;
  file: string;
  description: string;
  dependencies: string[];
}

export interface Category {
  name: string;
  description: string;
  icon: string;
}

export interface Registry {
  version: string;
  categories: Category[];
  utilities: UtilityMeta[];
}

export interface SearchOptions {
  limit?: number;
  category?: string;
  includeDescription?: boolean;
}

export interface DependencyInfo {
  utility: string;
  dependencies: string[];
  transitiveDependencies: string[];
  circularDependencies: string[];
}

export async function loadRegistry(): Promise<Registry> {
  const registryPath = path.join(__dirname, '../../registry/index.json');
  return await fs.readJson(registryPath);
}

export function findUtility(registry: Registry, name: string): UtilityMeta | undefined {
  return registry.utilities.find(u => u.name === name);
}

export function getUtilitiesByCategory(registry: Registry, category: string): UtilityMeta[] {
  return registry.utilities.filter(u => u.category === category);
}

/**
 * Enhanced search with options support
 */
export function searchUtilities(
  registry: Registry, 
  query: string, 
  options: SearchOptions = {}
): UtilityMeta[] {
  const {
    limit,
    category,
    includeDescription = true
  } = options;

  const lowerQuery = query.toLowerCase();
  
  let results = registry.utilities.filter(u => {
    if (category && u.category !== category) {
      return false;
    }
    
    if (u.name.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    if (includeDescription && u.description.toLowerCase().includes(lowerQuery)) {
      return true;
    }
    
    return false;
  });

  results.sort((a, b) => {
    const aExactName = a.name.toLowerCase() === lowerQuery;
    const bExactName = b.name.toLowerCase() === lowerQuery;
    
    if (aExactName && !bExactName) return -1;
    if (!aExactName && bExactName) return 1;
    
    const aStartsWithName = a.name.toLowerCase().startsWith(lowerQuery);
    const bStartsWithName = b.name.toLowerCase().startsWith(lowerQuery);
    
    if (aStartsWithName && !bStartsWithName) return -1;
    if (!aStartsWithName && bStartsWithName) return 1;
    
    return a.name.localeCompare(b.name);
  });

  return limit ? results.slice(0, limit) : results;
}

/**
 * Get all dependencies for a utility (including transitive dependencies)
 */
export function getDependencies(registry: Registry, utilityName: string): DependencyInfo {
  const utility = findUtility(registry, utilityName);
  if (!utility) {
    throw new Error(`Utility "${utilityName}" not found in registry`);
  }

  const visited = new Set<string>();
  const visiting = new Set<string>();
  const dependencies = new Set<string>();
  const circularDependencies: string[] = [];

  function collectDependencies(name: string): void {
    if (visiting.has(name)) {
      circularDependencies.push(name);
      return;
    }

    if (visited.has(name)) {
      return;
    }

    visiting.add(name);
    
    const util = findUtility(registry, name);
    if (util && util.dependencies) {
      util.dependencies.forEach(dep => {
        dependencies.add(dep);
        collectDependencies(dep);
      });
    }

    visiting.delete(name);
    visited.add(name);
  }

  collectDependencies(utilityName);

  return {
    utility: utilityName,
    dependencies: utility.dependencies || [],
    transitiveDependencies: Array.from(dependencies),
    circularDependencies
  };
}

/**
 * Get utilities that depend on a specific utility
 */
export function getDependents(registry: Registry, utilityName: string): UtilityMeta[] {
  return registry.utilities.filter(utility => 
    utility.dependencies && utility.dependencies.includes(utilityName)
  );
}

/**
 * Check if a utility has circular dependencies
 */
export function hasCircularDependencies(registry: Registry, utilityName: string): boolean {
  const depInfo = getDependencies(registry, utilityName);
  return depInfo.circularDependencies.length > 0;
}

/**
 * Get dependency graph for multiple utilities
 */
export function buildDependencyGraph(registry: Registry, utilityNames: string[]): Map<string, string[]> {
  const graph = new Map<string, string[]>();
  const visited = new Set<string>();

  function addToGraph(name: string): void {
    if (visited.has(name)) return;
    visited.add(name);

    const utility = findUtility(registry, name);
    if (!utility) return;

    const deps = utility.dependencies || [];
    graph.set(name, deps);

    deps.forEach(dep => addToGraph(dep));
  }

  utilityNames.forEach(name => addToGraph(name));
  return graph;
}

/**
 * Validate dependency integrity across the registry
 */
export function validateDependencies(registry: Registry): { valid: boolean, errors: string[] } {
  const errors: string[] = [];
  const utilityNames = new Set(registry.utilities.map(u => u.name));

  registry.utilities.forEach(utility => {
    if (utility.dependencies) {
      utility.dependencies.forEach(dep => {
        if (!utilityNames.has(dep)) {
          errors.push(`Utility "${utility.name}" depends on non-existent utility "${dep}"`);
        }
      });

      try {
        const depInfo = getDependencies(registry, utility.name);
        if (depInfo.circularDependencies.length > 0) {
          errors.push(`Circular dependency detected for utility "${utility.name}": ${depInfo.circularDependencies.join(' -> ')}`);
        }
      } catch (error) {
        errors.push(`Error checking dependencies for "${utility.name}": ${error}`);
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

export async function getCategoryNames(): Promise<string[]> {
  const registry = await loadRegistry();
  return registry.categories.map(cat => cat.name);
}

export async function getCategoryWithIcon(categoryName: string): Promise<{ name: string, icon?: string, description?: string } | null> {
  const registry = await loadRegistry();
  const category = registry.categories.find(cat => cat.name === categoryName);
  
  if (!category) {
    return null;
  }
  
  return {
    name: category.name,
    icon: category.icon,
    description: category.description
  };
}

export async function getUtilityCount(): Promise<number> {
  const registry = await loadRegistry();
  return registry.utilities.length;
}

export async function getCategoryCount(): Promise<number> {
  const registry = await loadRegistry();
  return registry.categories.length;
}

export async function searchUtilitiesWithCategory(query: string, options: SearchOptions = {}): Promise<(UtilityMeta & { categoryInfo?: { name: string, icon?: string } })[]> {
  const registry = await loadRegistry();
  const matchingUtilities = searchUtilities(registry, query, options);
  
  return matchingUtilities.map(utility => {
    const category = registry.categories.find(cat => cat.name === utility.category);
    return {
      ...utility,
      categoryInfo: category ? { name: category.name, icon: category.icon } : undefined
    };
  });
}

/**
 * Get utilities with their dependency counts
 */
export async function getUtilitiesWithDependencyInfo(): Promise<(UtilityMeta & { dependencyCount: number, dependentCount: number })[]> {
  const registry = await loadRegistry();
  
  return registry.utilities.map(utility => {
    const dependencyCount = utility.dependencies ? utility.dependencies.length : 0;
    const dependents = getDependents(registry, utility.name);
    
    return {
      ...utility,
      dependencyCount,
      dependentCount: dependents.length
    };
  });
}

/**
 * Enhanced registry validation with dependency checking
 */
export async function validateRegistry(): Promise<{ valid: boolean, errors: string[], warnings: string[] }> {
  try {
    const registry = await loadRegistry();
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!registry.version) {
      errors.push('Registry missing version field');
    }
    
    if (!Array.isArray(registry.categories)) {
      errors.push('Registry categories must be an array');
    }
    
    if (!Array.isArray(registry.utilities)) {
      errors.push('Registry utilities must be an array');
    }
    
    const categoryNames = registry.categories.map(cat => cat.name);
    registry.utilities.forEach(utility => {
      if (!categoryNames.includes(utility.category)) {
        errors.push(`Utility "${utility.name}" references non-existent category "${utility.category}"`);
      }
    });
    
    const utilityNames = registry.utilities.map(u => u.name);
    const duplicates = utilityNames.filter((name, index) => utilityNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate utility names found: ${[...new Set(duplicates)].join(', ')}`);
    }
    
    const depValidation = validateDependencies(registry);
    errors.push(...depValidation.errors);
    
    registry.utilities.forEach(utility => {
      const hasDependencies = utility.dependencies && utility.dependencies.length > 0;
      const hasDependents = getDependents(registry, utility.name).length > 0;
      
      if (!hasDependencies && !hasDependents) {
        warnings.push(`Utility "${utility.name}" has no dependencies and no dependents (potential orphan)`);
      }
    });
    
    registry.utilities.forEach(utility => {
      if (!utility.file.endsWith('.ts') && !utility.file.endsWith('.js')) {
        warnings.push(`Utility "${utility.name}" file "${utility.file}" should have .ts or .js extension`);
      }
    });
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  } catch (error) {
    return {
      valid: false,
      errors: [`Failed to load registry: ${error}`],
      warnings: []
    };
  }
}

/**
 * Get registry statistics
 */
export async function getRegistryStats(): Promise<{
  totalUtilities: number;
  totalCategories: number;
  averageDependencies: number;
  utilitiesWithDependencies: number;
  utilitiesWithoutDependencies: number;
  mostDependedOn: { name: string; count: number }[];
  categoryCounts: { category: string; count: number }[];
}> {
  const registry = await loadRegistry();
  
  const totalUtilities = registry.utilities.length;
  const totalCategories = registry.categories.length;
  
  const dependencyCounts = registry.utilities.map(u => u.dependencies ? u.dependencies.length : 0);
  const averageDependencies = dependencyCounts.reduce((a, b) => a + b, 0) / totalUtilities;
  
  const utilitiesWithDependencies = registry.utilities.filter(u => u.dependencies && u.dependencies.length > 0).length;
  const utilitiesWithoutDependencies = totalUtilities - utilitiesWithDependencies;
  
  const dependentCounts = new Map<string, number>();
  registry.utilities.forEach(utility => {
    if (utility.dependencies) {
      utility.dependencies.forEach(dep => {
        dependentCounts.set(dep, (dependentCounts.get(dep) || 0) + 1);
      });
    }
  });
  
  const mostDependedOn = Array.from(dependentCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
  
  const categoryCounts = registry.categories.map(category => ({
    category: category.name,
    count: registry.utilities.filter(u => u.category === category.name).length
  })).sort((a, b) => b.count - a.count);
  
  return {
    totalUtilities,
    totalCategories,
    averageDependencies: Math.round(averageDependencies * 100) / 100,
    utilitiesWithDependencies,
    utilitiesWithoutDependencies,
    mostDependedOn,
    categoryCounts
  };
}