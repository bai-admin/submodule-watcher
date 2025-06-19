import { WatcherService } from "./services/WatcherService";
import { ScaffoldService } from "./services/ScaffoldService";
import { CodemodService } from "./services/CodemodService";
import { log } from "./utils/logger";

(async function main() {
  const scaffold = await ScaffoldService.create(__dirname + "/templates");
  const codemod = new CodemodService();

  // Ensure root boilerplate exists once at startup
  await scaffold.ensureRootBoilerplate();

  const watcher = new WatcherService(async ctx => {
    await scaffold.ensureModuleBoilerplate(ctx);
    await codemod.applyAll(ctx);
    log.info("✓ module processed", ctx.moduleName);
  });

  watcher.start();
})();
