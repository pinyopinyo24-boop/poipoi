/**
 * PoipoiKernel - PoiPoi System Core
 * システムカーネル
 */

import Logger from "./Logger";
import EventBus from "./EventBus";
import ServiceManager from "./ServiceManager";
import Scheduler from "./Scheduler";
import ResourceManager from "./ResourceManager";
import PermissionManager from "./PermissionManager";

class PoipoiKernel {
  private logger: Logger;
  private eventBus: EventBus;
  private serviceManager: ServiceManager;
  private scheduler: Scheduler;
  private resourceManager: ResourceManager;
  private permissionManager: PermissionManager;
  private isRunning: boolean = false;

  constructor() {
    this.logger = new Logger();
    this.eventBus = new EventBus();
    this.serviceManager = new ServiceManager();
    this.scheduler = new Scheduler();
    this.resourceManager = new ResourceManager();
    this.permissionManager = new PermissionManager();

    this.logger.info("Kernel", "PoiPoi Kernel initialized");
  }

  getLogger(): Logger {
    return this.logger;
  }

  getEventBus(): EventBus {
    return this.eventBus;
  }

  getServiceManager(): ServiceManager {
    return this.serviceManager;
  }

  getScheduler(): Scheduler {
    return this.scheduler;
  }

  getResourceManager(): ResourceManager {
    return this.resourceManager;
  }

  getPermissionManager(): PermissionManager {
    return this.permissionManager;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.warn("Kernel", "Kernel already running");
      return;
    }

    this.logger.info("Kernel", "Starting PoiPoi Kernel...");
    await this.serviceManager.startAll();
    this.isRunning = true;
    this.eventBus.emit("kernel:started");
    this.logger.info("Kernel", "PoiPoi Kernel started successfully");
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.warn("Kernel", "Kernel not running");
      return;
    }

    this.logger.info("Kernel", "Stopping PoiPoi Kernel...");
    await this.serviceManager.stopAll();
    this.isRunning = false;
    this.eventBus.emit("kernel:stopped");
    this.logger.info("Kernel", "PoiPoi Kernel stopped");
  }

  isKernelRunning(): boolean {
    return this.isRunning;
  }

  getStatus() {
    return {
      running: this.isRunning,
      services: this.serviceManager.getStatus(),
      resources: this.resourceManager.getStats(),
      permissions: this.permissionManager.getStats(),
    };
  }
}

export default PoipoiKernel;
