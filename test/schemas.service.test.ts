import "chai";
import "mocha";

const expect = chai.expect;

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { Schema } from "dashboard/schema";
import { SchemasService } from "dashboard/schemas.service";

describe("SchemasService", () => {
  let chunkService: ChunksService;
  let service: SchemasService;
  let file: Schema;

  before(async () => {
    chunkService = new ChunksService();
    service = new SchemasService(chunkService);
    file = await service.makeRecord("foo", "bar");
    await service.updateRecord(file);
  });

  after(() => db.delete().then(() => db.open()));

  it("saves a record", async () => {
    const md = await service.getRecordByName("foo");
    const chunk = await chunkService.getRecordById(md!.chunk);
    expect(await chunk!.getData()).to.equal("bar");
  });

  describe("#getDownloadData", () => {
    it("returns the right data", async () =>
       expect(await service.getDownloadData(file)).to.equal("bar"));
  });
});
