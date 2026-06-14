import type { BotProjectConfig } from "./bot-config.js";

export interface MenuProjectItem {
  id: string;
  name: string;
}

export class ProjectCatalog {
  private readonly byId = new Map<string, BotProjectConfig>();
  readonly defaultKey: string;

  constructor(projects: BotProjectConfig[], defaultProjectId: string) {
    for (const project of projects) {
      this.byId.set(project.id.toLowerCase(), project);
    }
    this.defaultKey = defaultProjectId.toLowerCase();
    if (!this.byId.has(this.defaultKey)) {
      throw new Error(`ProjectCatalog: default project «${defaultProjectId}» not found`);
    }
  }

  get defaultProject(): BotProjectConfig {
    return this.byId.get(this.defaultKey)!;
  }

  get defaultPath(): string {
    return this.defaultProject.path;
  }

  listMenuProjects(): MenuProjectItem[] {
    return [...this.byId.values()].map((p) => ({ id: p.id, name: p.name }));
  }

  normalizeKey(key: string): string | null {
    const trimmed = key.trim().toLowerCase();
    if (!trimmed) return null;
    if (this.byId.has(trimmed)) return trimmed;
    for (const [id, project] of this.byId) {
      if (project.name.toLowerCase() === trimmed) return id;
    }
    return null;
  }

  resolve(key: string): BotProjectConfig | null {
    const normalized = this.normalizeKey(key);
    if (!normalized) return null;
    return this.byId.get(normalized) ?? null;
  }

  resolvePath(key: string): string {
    const project = this.resolve(key) ?? this.defaultProject;
    return project.path;
  }

  formatLabel(key: string): string {
    const project = this.resolve(key);
    return project?.name ?? key;
  }
}
