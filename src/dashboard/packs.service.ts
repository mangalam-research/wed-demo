/**
 * @desc The files service for the files module.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import { Injectable } from "@angular/core";
import { Observable } from "rxjs/Observable";
import { defer } from "rxjs/observable/defer";
import { concatMap } from "rxjs/operators/concatMap";
import { BaseName, constructTree, Event } from "salve";

import { Chunk } from "./chunk";
import { ChunksService } from "./chunks.service";
import { DBService, NameIdArray as NIA } from "./db.service";
import { Pack, PackPayload } from "./pack";
import { db } from "./store";

export type NameIdArray = NIA<number>;

type MatchingData = Record<string, number>;

function makeMatchKey(localName: string, namespaceURI: string): string {
  return `{${namespaceURI}}${localName}`;
}

function addToMatchingData(data: MatchingData, key: string, id: number): void {
  // If they key is already in our map, we privilege the packs with
  // newer ids.
  if (!(key in data) || (data[key] < id)) {
    data[key] = id;
  }
}

@Injectable()
export class PacksService extends DBService<Pack, number> {
  private readonly matchingData: Observable<MatchingData>;

  constructor(private readonly chunksService: ChunksService) {
    super(db.packs);
    let cachedData: Promise<MatchingData> | undefined;
    this.matchingData = defer(() => {
      if (cachedData === undefined) {
        cachedData = this.makeMatchingData();
      }

      return cachedData;
    });

    this.change.subscribe(() => {
      cachedData = undefined;
    });
  }

  private async makeMatchingData(): Promise<MatchingData> {
    const packs = await this.getRecords();
    const data: MatchingData = Object.create(null);
    for (const pack of packs) {
      const schemaID = pack.schema;
      // tslint:disable-next-line:no-non-null-assertion
      const id = pack.id!;
      const { localName, namespaceURI } = pack.match;
      if (localName === "") {
        // tslint:disable-next-line:no-non-null-assertion
        const schemaChunk = (await this.chunksService.getRecordById(schemaID))!;
        const schema = await schemaChunk.getData();
        const grammar = constructTree(schema);
        const walker = grammar.newWalker();
        const possible: Event[] = walker.possible().toArray();
        for (const event of possible) {
          if (event.params[0] === "enterStartTag") {
            const name = event.params[1] as BaseName;

            // We only work with simple patterns that match exactly one name.
            const names = name.toArray();
            if (names !== null && names.length === 1) {
              const key = makeMatchKey(names[0].name, names[0].ns);
              addToMatchingData(data, key, id);
            }
          }
        }
      }
      else {
        const key = makeMatchKey(localName, namespaceURI);
        addToMatchingData(data, key, id);
      }
    }

    return data;
  }

  /**
   * Get a match observable for the specified parameters. The match observable
   * will produce a new value whenever there has been a change in the packs
   * database that changes whether or not a pack matches the local name and
   * namespace URI passed.
   *
   * @param localName The local name of the element.
   *
   * @param namespaceURI The URI of the namespace of the element.
   *
   * @returns The observable tracking whether there's a match.
   */
  getMatchObservable(localName: string,
                     namespaceURI: string): Observable<Pack | undefined> {
    const key = makeMatchKey(localName, namespaceURI);
    return this.matchingData.pipe(
      concatMap(async (data) => {
        const id = data[key];
        return (id === undefined) ? undefined : this.getRecordById(id);
      }));
  }

  /**
   * The string passed must be in the interchange format for packs.
   */
  async makeRecord(_name: string,
                   data: string | Promise<string>): Promise<Pack> {
    // We do not use the _name parameter as the name of packs is stored in the
    // pack.
    data = await data;
    const obj = JSON.parse(data);
    if (obj.interchangeVersion !== 1) {
      throw new Error(`unknown interchangeVersion: ${obj.interchangeVersion}`);
    }

    // We have to store the schema and metadata into their respective tables,
    // and obtain the saved records.
    const metadataRecord = obj.metadata === undefined ?
      Promise.resolve(undefined) :
      this.chunksService.createRecord(obj.metadata);

    const [schema, metadata] =
      await Promise.all([this.chunksService.createRecord(obj.schema),
                         metadataRecord]) as [Chunk, Chunk | undefined];
    const payload: PackPayload = {
      mode: obj.mode,
      schema: schema.id,
      metadata: metadata === undefined ? undefined : metadata.id,
      match: obj.match,
    };

    return new Pack(obj.name, payload);
  }

  getDownloadData(record: Pack): Promise<string> {
    // We need to resolve the record ids stored for the schema and metadata.
    return Promise.all([record.schema, record.metadata]
                       .map((x) => {
                         if (x === undefined) {
                           return Promise.resolve(undefined);
                         }

                         return this.chunksService.getRecordById(x)
                            .then((chunk) => {
                              if (chunk === undefined) {
                                throw new Error("missing chunk");
                              }

                              return chunk.getData();
                            });
                       }))
      .then(([schema, metadata]) => {
        return JSON.stringify({
          interchangeVersion: 1,
          name: record.name,
          schema,
          mode: record.mode,
          metadata,
          match: record.match,
        });
      });
  }

  makeIndexedDBURL(file: Pack, property?: string): string {
    return db.makeIndexedDBURL(db.packs, file, property);
  }
}
