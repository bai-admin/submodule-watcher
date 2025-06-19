import nodePlop from "node-plop";
import { NodePlopAPI } from "plop";
import { join } from "path";
import { FileScaffoldResult, GenerationContext } from "../types";
import { log } from "../utils/logger";

/** Lazy-load plop so we don't pay the startup cost in non-scaffold runs. */
export class ScaffoldService {
  private constructor(private plop: NodePlopAPI, private templatesDir: string) {
    this.registerGenerators();
  }

  static async create(templatesDir: string): Promise<ScaffoldService> {
    const plop = await nodePlop("");
    return new ScaffoldService(plop, templatesDir);
  }

  private registerGenerators() {
    this.plop.setGenerator("moduleFiles", {
      description: "convex module boilerplate",
      prompts: [], // non-interactive
      actions: [
        {
          type: "add",
          skipIfExists: true,
          path: "{{absModulePath}}/tables.ts",
          templateFile: join(this.templatesDir, "tables.ts.hbs"),
        },
        {
          type: "add",
          skipIfExists: true,
          path: "{{absModulePath}}/http.ts",
          templateFile: join(this.templatesDir, "http.ts.hbs"),
        },
        {
          type: "add",
          skipIfExists: true,
          path: "{{absModulePath}}/convex.config.ts",
          templateFile: join(this.templatesDir, "component.config.ts.hbs"),
        },
      ],
    });

    this.plop.setGenerator("rootFiles", {
      description: "convex root boilerplate",
      prompts: [],
      actions: [
        {
          type: "add",
          skipIfExists: true,
          path: "convex/router.ts",
          templateFile: join(this.templatesDir, "router.ts.hbs"),
        },
        {
          type: "add",
          skipIfExists: true,
          path: "convex/http.ts",
          templateFile: join(this.templatesDir, "rootHttp.ts.hbs"),
        },
        {
          type: "add",
          skipIfExists: true,
          path: "convex/schema.ts",
          templateFile: join(this.templatesDir, "rootSchema.ts.hbs"),
        },
        {
          type: "add",
          skipIfExists: true,
          path: "convex/convex.config.ts",
          templateFile: join(this.templatesDir, "rootAppConfig.ts.hbs"),
        },
      ],
    });
  }

  async ensureModuleBoilerplate(ctx: GenerationContext): Promise<FileScaffoldResult[]> {
    const res = await this.plop.getGenerator("moduleFiles").runActions(ctx);
    res.changes?.forEach(c => log.info("Scaffold:", (c as any).path, (c as any).type));
    return (res.changes ?? []).map(c => ({ path: (c as any).path, created: (c as any).type === "add" }));
  }

  async ensureRootBoilerplate(): Promise<FileScaffoldResult[]> {
    const res = await this.plop.getGenerator("rootFiles").runActions({});
    res.changes?.forEach(c => log.info("Scaffold root:", (c as any).path, (c as any).type));
    return (res.changes ?? []).map(c => ({ path: (c as any).path, created: (c as any).type === "add" }));
  }
}
