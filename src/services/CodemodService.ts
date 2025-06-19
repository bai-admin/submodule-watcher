import { Project, SourceFile, ts } from "ts-morph";
import { join } from "path";
import { ROOT_CONFIG_FILE, ROOT_HTTP_FILE, ROOT_SCHEMA_FILE } from "../utils/pathHelpers";
import { GenerationContext, CodemodSummary } from "../types";
import { log } from "../utils/logger";

export class CodemodService {
  private project = new Project({ tsConfigFilePath: "tsconfig.json" });

  async applyAll(ctx: GenerationContext): Promise<CodemodSummary[]> {
    const summaries: CodemodSummary[] = [];
    summaries.push(await this.updateSchema(ctx));
    summaries.push(await this.updateRootHttp(ctx));
    summaries.push(await this.updateRootConfig(ctx));
    await this.project.save();
    return summaries;
  }

  // ---------------------------------------------------------------------
  private addImportOnce(sf: SourceFile, named: string, from: string): boolean {
    const existing = sf.getImportDeclarations().find(
      d => d.getModuleSpecifierValue() === from && d.getNamedImports().some(i => i.getName() === named),
    );
    if (existing) return false;
    sf.addImportDeclaration({ namedImports: [named], moduleSpecifier: from });
    return true;
  }

  private async updateSchema(ctx: GenerationContext): Promise<CodemodSummary> {
    let sf = this.project.getSourceFile(ROOT_SCHEMA_FILE);
    if (!sf) {
      sf = this.project.createSourceFile(ROOT_SCHEMA_FILE, "", { overwrite: false });
    }

    const changedImport = this.addImportOnce(sf, `${ctx.moduleName}Tables`, `./${ctx.moduleName}/tables`);

    // naive find defineSchema({ ... }) call
    const call = sf.getFirstDescendant(node => node.getText().startsWith("defineSchema")) as any;
    const objLit = call?.getArguments?.()[0]?.asKind?.(ts.SyntaxKind.ObjectLiteralExpression);
    let hasSpread = false;
    if (objLit) {
      hasSpread = objLit.getProperties().some(p => p.getText().includes(`...${ctx.moduleName}Tables`));
      if (!hasSpread) {
        objLit.addSpreadAssignment(`...${ctx.moduleName}Tables`);
      }
    }

    return { file: ROOT_SCHEMA_FILE, changed: changedImport || !hasSpread };
  }

  private async updateRootHttp(ctx: GenerationContext): Promise<CodemodSummary> {
    const sf = this.project.addSourceFileAtPathIfExists(ROOT_HTTP_FILE) ?? this.project.createSourceFile(ROOT_HTTP_FILE, "", { overwrite: false });

    const changedImport = this.addImportOnce(sf, `${ctx.moduleName}Router`, `./${ctx.moduleName}/http`);

    const callExists = sf
      .getDescendantsOfKind(ts.SyntaxKind.CallExpression)
      .some(c => c.getText().includes(`mergeRouters(http, ${ctx.moduleName}Router`));

    if (!callExists) {
      sf.addStatements(`mergeRouters(http, ${ctx.moduleName}Router);`);
    }

    return { file: ROOT_HTTP_FILE, changed: changedImport || !callExists };
  }

  private async updateRootConfig(ctx: GenerationContext): Promise<CodemodSummary> {
    const sf = this.project.addSourceFileAtPathIfExists(ROOT_CONFIG_FILE) ?? this.project.createSourceFile(ROOT_CONFIG_FILE, "", { overwrite: false });

    const importAdded = this.addImportOnce(sf, `${ctx.moduleName}Components`, `./${ctx.moduleName}/convex.config`);

    const callExists = sf
      .getDescendantsOfKind(ts.SyntaxKind.CallExpression)
      .some(c => c.getText().includes(`app.use(${ctx.moduleName}Components`));

    if (!callExists) {
      sf.addStatements(`app.use(${ctx.moduleName}Components);`);
    }

    return { file: ROOT_CONFIG_FILE, changed: importAdded || !callExists };
  }
}
