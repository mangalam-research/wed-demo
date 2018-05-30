import { XMLFile } from "./xml-file";

export abstract class XMLTransformService {
  constructor(readonly name: string) {}
  /**
   * Peforms the transformation on the file.
   *
   * @param input The file to transform.
   *
   * @returns A promise that resolves when the transformation is done.
   */
  abstract perform(input: XMLFile): Promise<{}>;
}
