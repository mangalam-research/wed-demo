import "chai";
import "mocha";

const expect = chai.expect;

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { Metadata } from "dashboard/metadata";
import { MetadataService } from "dashboard/metadata.service";

describe("MetadataService", () => {
  let chunkService: ChunksService;
  let service: MetadataService;
  let file: Metadata;

  // tslint:disable-next-line:mocha-no-side-effect-code
  const a = JSON.stringify({a: 1});

  before(async () => {
    chunkService = new ChunksService();
    service = new MetadataService(chunkService);
    file = await service.makeRecord("foo", a);
    return service.updateRecord(file);
  });

  after(() => db.delete().then(() => db.open()));

  it("saves a record", async () => {
    const chunk =
      await chunkService.getRecordById(
        (await service.getRecordByName("foo"))!.chunk);
    expect(await chunk!.getData()).to.equal(a);
  });

  describe("#getDownloadData", () => {
    it("returns the right data", async () =>
       expect(await service.getDownloadData(file)).to.equal(a));
  });
});
