import chokidar, { FSWatcher } from "chokidar";
import { MODULE_GLOB } from "../utils/pathHelpers";
import { log } from "../utils/logger";
import { GenerationContext } from "../types";

export class WatcherService {
  private watcher?: FSWatcher;

  constructor(private onModuleChange: (ctx: GenerationContext) => Promise<void>) {}

  start() {
    this.watcher = chokidar
      .watch(MODULE_GLOB, { depth: 0, ignoreInitial: false })
      .on("addDir", path => this.handle(path))
      .on("unlinkDir", path => this.handle(path))
      .on("raw", (_, path, details) => {
        // Some editors trigger raw rename events without the standard unlink/add sequence
        if ((details as any).event === "rename") {
          this.handle(path);
        }
      });

    log.info("Watcher ready:", MODULE_GLOB);
  }

  private async handle(absPath: string) {
    const moduleName = absPath.split(/[\\/]/).pop();
    if (!moduleName) return;
    if (moduleName !== moduleName.toLowerCase()) {
      log.warn("Module must be lowercase:", moduleName);
      return;
    }
    await this.onModuleChange({ moduleName, absModulePath: absPath });
  }

  stop() {
    this.watcher?.close();
  }
}
