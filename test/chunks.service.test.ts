import "chai";
import "mocha";

const expect = chai.expect;

import { db } from "dashboard/store";

import { Chunk } from "dashboard/chunk";
import { ChunksService } from "dashboard/chunks.service";
import { readFile } from "dashboard/store-util";

import { expectReject } from "./util";

describe("ChunksService", () => {
  let service: ChunksService;
  let file: Chunk;

  function loadRecords(total: number): Promise<Chunk[]> {
    const promises = [];
    for (let i: number = 1; i <= total; ++i) {
      promises.push(Chunk.makeChunk(new File([`content${i}`], `name${i}`))
                    .then(service.updateRecord.bind(service)));
    }
    return Promise.all(promises);
  }

  async function assertEqualChunks(a: Chunk, b: Chunk): Promise<void> {
    // Access data on both objects so that they become fit for a deep.equal.
    await Promise.all([a.getData(), b.getData()]);
    expect(a).to.deep.equal(b);
  }

  async function assertEqualLists(a: Chunk[], b: Chunk[]): Promise<void> {
    expect(a.length).to.equal(b.length);
    // Access data in both lists so that they become fit for a deep.equal.
    const promises: Promise<string>[] = [];
    for (let ix = 0; ix < a.length; ++ix) {
      promises.push(a[ix].getData(), b[ix].getData());
    }
    await Promise.all(promises);
    expect(a).to.deep.equal(b);
  }

  before(() => {
    service = new ChunksService();
  });

  beforeEach(async () => {
    file = await Chunk.makeChunk(new File(["foo"], "foo"));
  });

  afterEach(() => db.delete().then(() => db.open()));

  describe("#getRecords", () => {
    it("returns [] when the table is empty", async () =>
       expect(await service.getRecords()).to.deep.equal([]));

    it("returns an array of results", async () => {
      await service.updateRecord(file);
      await assertEqualLists(await service.getRecords(), [file]);
    });
  });

  describe("#deleteRecord", () => {
    it("deletes a record", async () => {
      await service.updateRecord(file);
      await assertEqualLists(await service.getRecords(), [file]);
      await service.deleteRecord(file);
      await assertEqualLists(await service.getRecords(), []);
    });
  });

  describe("#updateRecord", () => {
    it("adds the record, if it does not yet exist", () =>
       service.updateRecord(file)
       .then(() => service.getRecords())
       .then((records) => assertEqualLists(records, [file])));

    it("fails, when changing a record", () =>
       service.updateRecord(file)
       .then(() => service.getRecordById(file.id))
       .then((record) => assertEqualChunks(record!, file))
       .then(() => {
         // tslint:disable-next-line:no-any
         (file as any).file = new File(["something else"], "a");
         return expectReject(service.updateRecord(file),
                             Error, /trying to update chunk with id/);
       }));

    it("is a no-op on an existing, unchaged record", async () => {
      await service.updateRecord(file);
      await assertEqualChunks((await service.getRecordById(file.id))!, file);
      expect(await service.updateRecord(file)).to.deep.equal(file);
    });
});

  describe("#getRecordById", () => {
    it("gets the specified record", async () => {
      await service.updateRecord(file);
      await assertEqualChunks((await service.getRecordById(file.id))!, file);
    });

    it("gets undefined if the record does not exist", async () =>
       expect(await service.getRecordById("not"),
              "record should not exist").to.be.undefined);
  });

  describe("#loadFromFile", () => {
    async function check(record: Chunk): Promise<void> {
      expect(record, "record should have an id").
        to.have.property("id").not.be.undefined;
      expect(await readFile(record.file)).to.equal("something");
    }

    it("loads into a new record", () =>
       service.loadFromFile(new File(["something"], "foo")).then(check));

    it("loads into an existing record", async () => {
      const newFile = new File(["something"], "newfile");
      const record = await service.loadFromFile(newFile);
      await check(record);
      expect(await service.recordCount).to.equal(1);
      const otherRecord = await service.loadFromFile(newFile);
      expect(otherRecord.id).to.equal(record.id);
      expect(await service.recordCount).to.equal(1);
    });
  });

  describe("#clear", () => {
    it("clears the database", async () => {
      await service.updateRecord(file);
      expect(await service.recordCount).to.equal(1);
      await service.clear();
      expect(await service.recordCount).to.equal(0);
    });
  });

  describe("#recordCount", () => {
    it("provides a count of 0 when the database is empty", async () =>
       expect(await service.recordCount).to.equal(0));

    it("provides the count of records", async () => {
      await loadRecords(3);
      expect(await service.recordCount).to.equal(3);
    });
  });
});
