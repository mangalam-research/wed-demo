// tslint:disable-next-line:import-name no-require-imports
import md5 = require("blueimp-md5");
import { readFile } from "./store-util";

export class Chunk {
  readonly id: string;
  readonly file: File;
  readonly recordVersion: number = 1;

  // tslint:disable-next-line:variable-name
  private __data: Promise<string>;

  static async makeChunk(file: File | string | Promise<File | string>):
  Promise<Chunk> {

    const resolved = await file;

    if (typeof resolved === "string") {
      return new Chunk(md5(resolved), new File([resolved], ""), resolved);
    }

    const data = await readFile(resolved);
    return new Chunk(md5(data), resolved, data);
  }

  private constructor(id: string, file: File, data: string) {
    this.file = file;
    this.id = id;
    this.__data = Promise.resolve(data);
  }

  getData(): Promise<string> {
    if (this.__data === undefined) {
      this.__data = readFile(this.file);
    }

    return this.__data;
  }

  get recordType(): "Chunk" {
    return "Chunk";
  }
}
