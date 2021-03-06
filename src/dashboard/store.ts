/**
 * @desc The store for the dashboard.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

//
// See these issues regarding dexie:
//
// https://github.com/dfahlander/Dexie.js/issues/317
// https://github.com/dfahlander/Dexie.js/issues/116
//
// https://github.com/inexorabletash/indexeddb-promises
//
import Dexie from "dexie"; // tslint:disable-line:import-name

import { Chunk } from "./chunk";
import { Metadata } from "./metadata";
import { Pack } from "./pack";
import { Schema } from "./schema";
import { readFile } from "./store-util";
import { XMLFile } from "./xml-file";

//
// We reexport this because the adapter for wed (wed-store) needs to be able to
// create Chunks. It also needs to load this module to manipulate the
// database. It is better to have store be a facade providing everything the
// adapter needs, than require the adapter to also load "./chunk" manually.
//
export { Chunk };

export type XMLFilesTable = Dexie.Table<XMLFile, number>;
export type PackTable = Dexie.Table<Pack, number>;
export type SchemaTable = Dexie.Table<Schema, number>;
export type MetadataTable = Dexie.Table<Metadata, number>;
export type ChunkTable = Dexie.Table<Chunk, string>;
export type AllTables = XMLFilesTable | PackTable | SchemaTable |
  MetadataTable | ChunkTable;

export class Store extends Dexie {
  xmlfiles!: XMLFilesTable;
  packs!: PackTable;
  schemas!: SchemaTable;
  metadata!: MetadataTable;
  chunks!: ChunkTable;

  constructor() {
    super("wed");
    this.version(1).stores({
      xmlfiles: "++id,&name,pack",
      packs: "++id,&name",
      schemas: "++id,&name",
      metadata: "++id,&name",
      chunks: "++id",
    });
    // We add recordVersion to all record types to allow for fast upgrade
    // checks. Since a check is performed with each startup, we want it to be
    // fast.
    this.version(2).stores({
      xmlfiles: "++id,&name,pack,recordVersion",
      packs: "++id,&name,recordVersion",
      schemas: "++id,&name,recordVersion",
      metadata: "++id,&name,recordVersion",
      chunks: "++id,recordVersion",
    });

    this.xmlfiles.mapToClass(XMLFile);
    this.packs.mapToClass(Pack);
    this.schemas.mapToClass(Schema);
    this.metadata.mapToClass(Metadata);
    this.chunks.mapToClass(Chunk);

    // As a matter of convention in this application we remove keys that
    // start with __.
    // tslint:disable:no-any
    function creationHook(_key: any, obj: any): void {
      for (const prop in obj) {
        if (prop.lastIndexOf("__", 0) === 0) {
          delete obj[prop];
        }
      }
    }

    function updateHook(modifications: any, _key: any, _obj: any): any {
      const ret: {[name: string]: any} = {};
      for (const prop in modifications) {
        if (prop.lastIndexOf("__", 0) === 0) {
          // This is an instruction to Dexie to remove the value.
          ret[prop] = undefined;
        }
      }
      return ret;
    }
    // tslint:enable

    for (const table of this.tables) {
      table.hook("creating", creationHook);
      table.hook("updating", updateHook);
    }
  }

  makeIndexedDBURL(table: AllTables,
                   //tslint:disable-next-line:no-any
                   object: string | number | { [name: string]: any },
                   property?: string): string {
    let key: number | string;
    if (typeof object === "object") {
      const keyPath = table.schema.primKey.keyPath;
      if (keyPath instanceof Array) {
        throw new Error("does not support compound indexes");
      }

      key = object[keyPath];
    }
    else {
      key = object;
    }

    const keyType = typeof key;

    if (["number", "string"].indexOf(keyType) === -1) {
      throw new Error(`cannot use primary key of type: ${keyType}`);
    }

    const dbname = this.name;
    const tname = table.name;
    let url = `indexeddb://v1/${dbname}/${tname}/${keyType}/${key}`;
    if (property !== undefined) {
      url += `/${property}`;
    }

    return url;
  }

  chunkIdToData(id: string): Promise<string> {
    return this.chunks.get(id)
      .then((chunk) => {
        if (chunk === undefined) {
          throw new Error("missing chunk");
        }

        return readFile(chunk.file);
      });
  }

  /**
   * Dumps the database data to a string.
   */
  dump(): Promise<string> {
    // tslint:disable-next-line:no-any
    const dump: any = {
      creationDate: new Date().toString(),
      interchangeVersion: 1,
      tables: {
      },
    };

    const tableDump = dump.tables;
    return Dexie.Promise.all(this.tables.map(
      (table) => table.toArray().then((records) => {
        tableDump[table.name] = records;
        if (table.name === "chunks") {
          // The chunks table is special. Each chunk contains a file field which
          // is a File object. However, File is not serializable. The only part
          // of the File we use is its content, so replace the file with the
          // string value of its content.
          return Dexie.Promise.all(records.map(
            (record) => readFile(record.file).then((read) => {
              record.file = read;
            }))).then(() => undefined);
        }

        return undefined;
      }))).then(() => JSON.stringify(dump));
  }

  /**
   * Load a dump into the database. **THIS WILL WIPE THE DATABASE.**
   *
   * @param data A data dump.
   */
  load(data: string): Promise<void> {
    return Dexie.Promise.resolve().then(() => {
      const dump = JSON.parse(data);
      if (dump.interchangeVersion !== 1) {
        throw new Error(`incorrect version number: ${dump.interchangeVersion}`);
      }

      const tableDump = dump.tables;
      return Dexie.Promise.all(this.tables.map(
        (table) => table.clear()
          .then(() => {
            const records = tableDump[table.name];
            if (records === undefined) {
              return;
            }

            // The chunks table is special. We have to recreate a File object
            // from the serialized data.
            if (table.name === "chunks") {
              for (const record of records) {
                record.file = new File([record.file], "");
              }
            }

            return table.bulkAdd(records);
          })))
        .then(() => undefined);
    });
  }
}

export const db: Store = new Store();
