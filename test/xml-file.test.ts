import "chai";
import "mocha";

const expect = chai.expect;

import { db } from "dashboard/store";

import { Chunk } from "dashboard/chunk";
import { XMLFile } from "dashboard/xml-file";

describe("XMLFile", () => {
  let chunkOne: Chunk;
  let one: XMLFile;

  before(async () => {
    const chunks =
      await Promise.all([Chunk.makeChunk(new File(["content"], "a"))]);
    await Promise.all(chunks.map((x) => db.chunks.put(x)));
    [chunkOne] = chunks;
    one = new XMLFile("a", chunkOne.id);
  });

  after(() => db.delete().then(() => db.open()));

  it("#recordType is 'XMLFile'",
     async () => expect(one.recordType).to.equal("XMLFile"));

  it("#saved is set to 'never'",
     async () => expect(one.saved).to.equal("never"));

  it("#chunk is correct",
     async () => expect(one.chunk).to.equal(chunkOne.id));

  it("#data is correct",
     async () => expect(await one.getData()).to.equal("content"));
});
