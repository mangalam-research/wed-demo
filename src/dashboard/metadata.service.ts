/**
 * @desc The files service for the files module.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import { Injectable } from "@angular/core";

import { Chunk } from "./chunk";
import { ChunksService } from "./chunks.service";
import { DBService, NameIdArray as NAI} from "./db.service";
import { Metadata } from "./metadata";
import { db } from "./store";

export type NameIdArray = NAI<number>;

@Injectable()
export class MetadataService extends DBService<Metadata, number> {
  constructor(private readonly chunksService: ChunksService) {
    super(db.metadata);
  }

  async makeRecord(name: string,
                   data: string | Promise<string>): Promise<Metadata> {
    const chunk = await Chunk.makeChunk(data);
    return new Metadata(name, await this.chunksService.updateRecord(chunk));
  }

  getDownloadData(record: Metadata): Promise<string> {
    return record.getData();
  }

}
