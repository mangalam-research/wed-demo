/**
 * @desc The files service for the files module.
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import Dexie from "dexie"; // tslint:disable-line:import-name
import { Observable } from "rxjs/Observable";
import { Subject } from "rxjs/Subject";

import { readFile } from "./store-util";

export interface IValue<Key> {
  id?: Key;
  name: string;
}

export interface Loader<Value> {
  loadFromFile(file: File, record?: Value | null): Promise<Value>;
  safeLoadFromFile(file: File,
                   confirmerOrIntoRecord?: Confirmer | Value):
  Promise<Value | undefined>;
}

export interface Clearable {
  clear(): Promise<void>;
}

export type Confirmer = (message: string) => Promise<boolean>;
export type WriteCheckResult<Value> = {write: boolean, record: Value | null};

export type NameIdArray<Key> = {name: string, id: Key}[];

export abstract class DBService<Value extends IValue<Key>,
Key extends string | number> implements Loader<Value>, Clearable {
  private readonly boundModified: <R>(arg: R) => R;
  private readonly _change: Subject<void>;
  public readonly change: Observable<void>;

  constructor(protected readonly table: Dexie.Table<Value, Key>) {
    this.boundModified = this.modified.bind(this);
    this._change = new Subject();
    this.change = this._change.asObservable();

  }

  private modified<R>(arg?: R): R | undefined{
    this._change.next();
    return arg;
  }

  getRecords(): Promise<Value[]> {
    return this.table.toArray();
  }

  deleteRecord(record: Value): Promise<void> {
    return Promise.resolve().then(() => {
      if (record.id === undefined) {
        throw new Error("missing id!");
      }

      // Dexie's table.delete will resolve exactly the same whether or not a
      // record was actually deleted. This means that in *theory* we could get a
      // change event even though nothing was removed. We're not doing anything
      // to optimize for this. We'd have to query the table first.
      return this.table.delete(record.id).then(this.boundModified);
    });
  }

  updateRecord(record: Value): Promise<Value> {
    return this.table.put(record).then((key) => {
      if (record.id == null) {
        record.id = key;
      }

      this.boundModified(null);
      return record;
    });
  }

  getRecordById(id: number): Promise<Value | undefined> {
    return this.table.get({ id });
  }

  getRecordByName(name: string): Promise<Value | undefined> {
    return this.table.get({ name });
  }

  loadFromFile(file: File, record?: Value | null): Promise<Value> {
    return readFile(file)
      .then((data) => this.makeRecord(file.name, data))
      .then((newRecord) => {
        if (record != null) {
          newRecord.id = record.id;
          newRecord.name = record.name;
        }

        return newRecord;
      })
      .then((recorded) => this.updateRecord(recorded));
  }

  writeCheck(name: string, confirmer: Confirmer):
  Promise<WriteCheckResult<Value>> {
    return this.getRecordByName(name)
      .then((record):
            Promise<WriteCheckResult<Value>> | WriteCheckResult<Value> => {
        if (record == null) {
          return {write: true, record: null};
        }

        return confirmer(`Are you sure you want to overwrite ${name}?`)
          .then((write) => ({ write, record }));
      });
  }

  safeLoadFromFile(file: File, confirmerOrIntoRecord: Confirmer | Value):
  Promise<Value | undefined> {
    let intoRecord: Value | undefined;
    let confirmer: Confirmer | undefined;
    if (confirmerOrIntoRecord instanceof Function) {
      confirmer = confirmerOrIntoRecord;
    }
    else {
      intoRecord = confirmerOrIntoRecord;
    }

    if (intoRecord != null) {
      return this.loadFromFile(file, intoRecord);
    }
    else {
      // confirmer cannot be undefined if we get here...
      // tslint:disable-next-line:no-non-null-assertion
      return this.writeCheck(file.name, confirmer!)
        .then(({ write, record}): Promise<Value | undefined> | undefined => {
          if (write) {
            return this.loadFromFile(file, record);
          }

          return undefined;
        });
    }
  }

  clear(): Promise<void> {
    // Dexie's table.clear will resolve exactly the same whether or not a
    // records were deleted. This means that in *theory* we could get a change
    // event even though nothing was removed. We're not doing anything to
    // optimize for this. We'd have to query the table first.
    return Promise.resolve(this.table.clear().then(this.boundModified));
  }

  /**
   * Make a new record. This record is *not* saved in the database by this
   * method.
   *
   * @param name The name of the record.
   *
   * @param data The data making up the record.
   *
   * @returns A promise resolving to the new record.
   */
  abstract makeRecord(name: string, data: string | Promise<string>):
  Promise<Value>;

  /**
   * Make a new record and immediately save it to the database.
   *
   * @param name The name of the record.
   *
   * @param data The data making up the record.
   *
   * @returns A promise resolving to the saved record.
   */
  saveNewRecord(name: string, data: string): Promise<Value> {
    return this.makeRecord(name, data)
      .then((record) => this.updateRecord(record));
  }

  abstract getDownloadData(record: Value): Promise<string>;

  getNameIdArray(): Promise<NameIdArray<Key>> {
    return this.getRecords()
      .then((records) =>
            records.map((record: Value) => ({
              name: record.name,
              // tslint:disable-next-line:no-non-null-assertion
              id: record.id!,
            })));
  }

  getRecordCount(): Promise<number> {
    return this.table.count();
  }
}
