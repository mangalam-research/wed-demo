import { RecordCommon } from "./record-common";

export interface PackPayload {
  /**
   * For a pack that is in transit (download/upload/API/etc) this field contains
   * the actual serialized schema. In the database, this field is an id that
   * refers to the chunk that contains the schema.
   */
  schema: string;

  /**
   * For a pack that is in transit (download/upload/API/etc) this field contains
   * the actual serialized metadata. In the database, this field is an id that
   * refers to the chunk that contains the metadata.
   */
  metadata?: string;

  /**
   * The name of the mode.
   */
  mode: string;
}

export class Pack extends RecordCommon implements PackPayload {
  recordVersion: number = 2;
  schema: string;
  metadata?: string;
  mode: string;

  constructor(name: string, payload?: PackPayload) {
    super(name);
    if (payload !== undefined) {
      this.schema =  payload.schema;
      this.metadata = payload.metadata;
      this.mode = payload.mode;
    }
  }

  get recordType(): "Pack" {
    return "Pack";
  }

  clone(): Pack {
    const into = new Pack(this.name);
    this.copyInto(into);
    return into;
  }

  copyInto(into: Pack): void {
    super.copyInto(into);
    into.schema = this.schema;
    into.metadata = this.metadata;
    into.mode = this.mode;
  }
}
