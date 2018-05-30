import "chai";
import "mocha";
import { first } from "rxjs/operators";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);

const expect = chai.expect;

// DBService is an abstract class, so we have to test it through
// something. We use XMLFilesService for this job.

import { ChunksService } from "dashboard/chunks.service";
import { db } from "dashboard/store";
import { XMLFile } from "dashboard/xml-file";
import { XMLFilesService } from "dashboard/xml-files.service";

import { expectReject } from "./util";

describe("DBService", () => {
  let chunksService: ChunksService;
  let service: XMLFilesService;
  let file: XMLFile;

  before(() => {
    chunksService = new ChunksService();
    service = new XMLFilesService(chunksService);
  });

  beforeEach(async () => {
    file = await service.makeRecord("foo", "bar");
  });

  afterEach(() => db.delete().then(() => db.open()));

  function loadRecords(total: number): Promise<XMLFile[]> {
    const promises = [];
    for (let i: number = 1; i <= total; ++i) {
      const name = `file${i}`;
      promises.push(service.makeRecord(name, `content${i}`)
                    .then(service.updateRecord.bind(service)));
    }
    return Promise.all(promises);
  }

  describe("#getRecords", () => {
    it("returns [] when the table is empty",
       async () => expect(await service.getRecords()).to.deep.equal([]));

    it("returns an array of results", async () => {
      await service.updateRecord(file);
      expect(await service.getRecords()).to.deep.equal([file]);
    });
  });

  describe("#deleteRecord", () => {
    it("deletes a record", async () => {
      await service.updateRecord(file);
      expect(await service.getRecords()).to.deep.equal([file]);
      await service.deleteRecord(file);
      expect(await service.getRecords()).to.deep.equal([]);
    });

    it("emits a modification", async () => {
      await service.updateRecord(file);
      expect(await service.getRecords()).to.deep.equal([file]);

      const ret = service.change.pipe(first()).toPromise();
      // It does not matter if the next promise is "lost". We're simulating
      // some other code causing a change.
      service.deleteRecord(file) as {};
      return ret;
    });

    it("throws if the record has no id", () => {
      expect(file).to.not.have.property("id");
      return expectReject(service.deleteRecord(file), Error, /missing id/);
    });
  });

  describe("#updateRecord", () => {
    it("adds the record, if it does not yet exist", async () => {
      await service.updateRecord(file);
      expect(await service.getRecords()).to.deep.equal([file]);
    });

    it("changes the record, if it already exists", async () => {
      await service.updateRecord(file);
      expect(await service.getRecordById(file.id!)).to.deep.equal(file);
      file.name = "q";
      await service.updateRecord(file);
      expect(await service.getRecordById(file.id!)).to.deep.equal(file);
    });

    it("emits a modification", () => {
      const ret = service.change.pipe(first()).toPromise();
      // It does not matter if the next promise is "lost". We're simulating
      // some other code causing a change.
      service.updateRecord(file) as {};
      return ret;
    });

    it("updates the record id, if it was undefined", async () => {
      expect(file).to.not.have.property("id");
      await service.updateRecord(file);
      expect(file).to.have.property("id").not.be.undefined;
    });
  });

  describe("#getRecordById", () => {
    it("gets the specified record", async () => {
      await service.updateRecord(file);
      expect(await service.getRecordById(file.id!)).to.deep.equal(file);
    });

    it("gets undefined if the record does not exist", async () =>
       expect(await service.getRecordById(999),
              "the record should not exist").to.be.undefined);
  });

  describe("#getRecordByName", () => {
    it("gets the specified record", async () => {
      await service.updateRecord(file);
      expect(await service.getRecordByName(file.name)).to.deep.equal(file);
    });

    it("gets undefined if the record does not exist", async () =>
       expect(await service.getRecordByName("nonexistent"),
              "the record should not exist").to.be.undefined);
  });

  describe("#loadFromFile", () => {
    it("loads into a new record, when no record is specified", async () => {
      async function check(record: XMLFile): Promise<void> {
        expect(record).to.have.property("id").not.be.undefined;
        expect(record).to.have.property("name").equal("foo");
        expect(await record.getData()).to.equal("something");
      }

      await check(await service.loadFromFile(new File(["something"], "foo")));
      await check((await service.getRecordByName("foo"))!);
    });

    it("loads into an existing record", async () => {
      async function check(record: XMLFile): Promise<void> {
        expect(record).to.have.property("id").not.be.undefined;
        // The name of the File object was ignored.
        expect(record).to.have.property("name").equal("foo");
        expect(await record.getData()).to.equal("something");
      }

      await service.updateRecord(file);
      await check(await service.loadFromFile(new File(["something"], "newfile"),
                                             file));
      await check((await service.getRecordByName("foo"))!);
    });
  });

  describe("#writeCheck", () => {
    describe("when there is no conflict", () => {
      it("returns { write: true, record: null }", async () => {
        expect(await service.writeCheck(file.name, () => {
          throw new Error("called");
        })).to.deep.equal({write: true, record: null});
      });
    });

    describe("when there is a conflict", () => {
      it("returns { write: false, record: <some record>} if the user declined",
         async () => {
           const stub = sinon.stub();
           stub.returns(Promise.resolve(false));
           await service.updateRecord(file);
           expect(await service.writeCheck(file.name, stub))
             .to.deep.equal({ write: false, record: file });
           expect(stub).to.have.been.calledOnce;
         });

      it("returns { write: true, record: <some record>} if the user accepted",
         async () => {
           const stub = sinon.stub();
           stub.returns(Promise.resolve(true));
           await service.updateRecord(file);
           expect(await service.writeCheck(file.name, stub))
             .to.deep.equal({ write: true, record: file });
           expect(stub).to.have.been.calledOnce;
         });
    });
  });

  describe("#safeLoadFromFile", () => {
    it("loads into an existing record", async () => {
      async function check(record: XMLFile): Promise<void> {
        expect(record).to.have.property("id").not.be.undefined;
        // The name of the File object was ignored.
        expect(record).to.have.property("name").equal("foo");
        expect(await record.getData()).to.equal("something");
      }

      await service.updateRecord(file);
      await check((await service.safeLoadFromFile(new File(["something"],
                                                           "newfile"),
                                                  file))!);
      await check((await service.getRecordByName("foo"))!);
    });

    it("loads into a new record if the file name does not exist", async () => {
      async function check(record: XMLFile): Promise<void> {
        expect(record).to.have.property("id").not.be.undefined;
        expect(record).to.have.property("name").equal("newfile");
        expect(await record.getData()).to.equal("something");
      }

      await check(
        (await service.safeLoadFromFile(new File(["something"], "newfile"),
                                       () => {
                                         throw new Error("stub called");
                                       }))!);
      await check((await service.getRecordByName("newfile"))!);
    });

    it("loads into the an existing record if the user accepts", async () => {
      async function check(record: XMLFile): Promise<void> {
        expect(record).to.have.property("id").equal(file.id);
        expect(record).to.have.property("name").equal(file.name);
        expect(await record.getData()).to.equal("something");
      }

      let asked = false;
      // Make sure we start with data different from what we're
      // going to set the file to.
      expect(await file.getData()).to.not.be.equal("something");

      await service.updateRecord(file);

      await check(
        (await service.safeLoadFromFile(new File(["something"], file.name),
                                        () => {
                                          asked = true;
                                          return Promise.resolve(true);
                                        }))!);
      await check((await service.getRecordByName(file.name))!);
      expect(await service.getRecordCount()).to.equal(1);
      expect(asked, "should have asked").to.be.true;
    });

    it("does not load if the user rejects", async () => {
      async function check(toCheck: XMLFile): Promise<void> {
        expect(toCheck).to.have.property("id").equal(file.id);
        expect(toCheck).to.have.property("name").equal(file.name);
        expect(await toCheck.getData()).to.equal("bar");
      }

      let asked = false;

      // Make sure we start with data different from what we're
      // going to set the file to.
      expect(await file.getData()).to.not.be.equal("something");

      await service.updateRecord(file);
      const record =
        await service.safeLoadFromFile(new File(["something"], file.name),
                                       () => {
                                         asked = true;
                                         return Promise.resolve(false);
                                       });
      expect(record, "should not have found a record").to.be.undefined;
      await check((await service.getRecordByName(file.name))!);
      expect(await service.getRecordCount()).to.equal(1);
      expect(asked, "should have asked").to.be.true;
    });
  });

  describe("#clear", () => {
    it("clears the database", async () => {
      await service.updateRecord(file);
      expect(await service.getRecordCount()).to.equal(1);
      await service.clear();
      expect(await service.getRecordCount()).to.equal(0);
    });

    it("emits a modification", async () => {
      await service.updateRecord(file);
      const ret = service.change.pipe(first()).toPromise();
      // It does not matter if the next promise is "lost". We're simulating
      // some other code causing a change.
      service.clear() as {};
      return ret;
    });
  });

  describe("#getNameIdArray", () => {
    it("provides an empty array when the database is empty", async () =>
       expect(await service.getNameIdArray()).to.deep.equal([]));

    it("provides a filled array when there are records", async () => {
      const expected = (await loadRecords(3)).map((record) => ({
        name: record.name,
        id: record.id,
      }));
      expect(expected).to.have.length.above(0);
      expect(await service.getNameIdArray()).to.deep.equal(expected);
    });
  });

  describe("#getRecordCount()", () => {
    it("provides a count of 0 when the database is empty", async () =>
       expect(await service.getRecordCount()).to.equal(0));

    it("provides the count of records", async () => {
      await loadRecords(3);
      expect(await service.getRecordCount()).to.deep.equal(3);
    });
  });
});
