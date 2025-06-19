export type ModuleName = string; // enforced lowercase elsewhere

export interface GenerationContext {
  moduleName: ModuleName;
  absModulePath: string; // /abs/path/convex/{{name}}
}

export interface FileScaffoldResult {
  path: string;
  created: boolean; // false = already existed
}

export interface CodemodSummary {
  file: string;
  changed: boolean;
}
