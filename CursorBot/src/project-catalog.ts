import type { BotProjectConfig } from "./bot-config.js";

export interface MenuProjectItem {
  id: string;
  name: string;
}

export class ProjectCatalog {
  private readonly byId = new Map<string, BotProjectConfig>();
  private defaultKeyValue: string;

  constructor(projects: BotProjectConfig[], defaultProjectId: string) {
    this.defaultKeyValue = defaultProjectId.toLowerCase();
    this.replaceAll(projects);
    if (!this.byId.has(this.defaultKeyValue)) {
      throw new Error(`ProjectCatalog: default project «${defaultProjectId}» not found`);
    }
  }

  get defaultKey(): string {
    return this.defaultKeyValue;
  }

  listAllProjects(): BotProjectConfig[] {
    return [...this.byId.values()];
  }

  /** Полностью заменяет список проектов в памяти (без изменения default). */
  replaceAll(projects: BotProjectConfig[]): void {
    this.byId.clear();
    for (const project of projects) {
      this.byId.set(project.id.toLowerCase(), project);
    }
  }

  /** Добавляет проект в каталог без перезапуска бота. */
  addProject(project: BotProjectConfig): void {
    const key = project.id.toLowerCase();
    if (this.byId.has(key)) {
      throw new Error(`Проект с id «${project.id}» уже существует`);
    }
    for (const existing of this.byId.values()) {
      if (existing.name.toLowerCase() === project.name.toLowerCase()) {
        throw new Error(`Проект с названием «${project.name}» уже существует`);
      }
    }
    this.byId.set(key, project);
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
