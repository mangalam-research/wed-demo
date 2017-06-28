import { Inject, Injectable, Optional } from "@angular/core";
import * as modeList from "wed/mode-map";

export interface ModeInfo {
  name: string;
  path: string;
}

@Injectable()
export class ModesService {
  private map: Record<string, string> = modeList.modes;
  private reverse: Record<string, string> = Object.create(null);

  constructor(@Optional() @Inject("Mode") additionalModes?: ModeInfo[] | null) {
    for (const key of Object.keys(this.map)) {
      const path = this.map[key];
      if (path in this.reverse) {
        throw new Error(`ambiguous mapping for ${path}`);
      }
      this.reverse[path] = key;
    }

    if (additionalModes != null) {
      for (const mode of additionalModes) {
        this.addMode(mode.name, mode.path);
      }
    }
  }

  get modes(): string[] {
    return Object.keys(this.map);
  }

  /**
   * Adds a mode to the list of builtin modes.
   */
  addMode(name: string, path: string): void {
    if (name in this.map) {
      throw new Error(`overwriting mode ${name}`);
    }

    this.map[name] = path;

    if (path in this.reverse) {
      throw new Error(`ambiguous mapping for ${path}`);
    }
    this.reverse[path] = name;
  }

  modeToPath(mode: string): string {
    return this.map[mode];
  }

  pathToMode(path: string): string {
    return this.reverse[path];
  }
}
