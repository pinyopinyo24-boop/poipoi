/**
 * ServiceManager - PoiPoi System Core
 * サービス管理
 */

export interface Service {
  name: string;
  version: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): string;
}

class ServiceManager {
  private services: Map<string, Service & { running: boolean }> = new Map();

  register(service: Service): void {
    this.services.set(service.name, {
      ...service,
      running: false,
    });
    console.log(`📦 サービス登録: ${service.name} v${service.version}`);
  }

  async start(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service not found: ${name}`);

    if (service.running) {
      console.warn(`Service already running: ${name}`);
      return;
    }

    await service.start();
    service.running = true;
    console.log(`✅ サービス起動: ${name}`);
  }

  async stop(name: string): Promise<void> {
    const service = this.services.get(name);
    if (!service) throw new Error(`Service not found: ${name}`);

    if (!service.running) {
      console.warn(`Service not running: ${name}`);
      return;
    }

    await service.stop();
    service.running = false;
    console.log(`⏹️ サービス停止: ${name}`);
  }

  async startAll(): Promise<void> {
    for (const name of Array.from(this.services.keys())) {
      await this.start(name);
    }
  }

  async stopAll(): Promise<void> {
    for (const name of Array.from(this.services.keys())) {
      await this.stop(name);
    }
  }

  getService(name: string): Service | undefined {
    return this.services.get(name);
  }

  getAllServices(): Service[] {
    return Array.from(this.services.values());
  }

  getStatus(name?: string) {
    if (name) {
      const service = this.services.get(name);
      return service ? { name, running: service.running, status: service.getStatus() } : null;
    }

    return Array.from(this.services.entries()).map(([name, service]) => ({
      name,
      running: service.running,
      status: service.getStatus(),
    }));
  }
}

export default ServiceManager;
