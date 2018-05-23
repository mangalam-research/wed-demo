import "chai";
import "mocha";

const expect = chai.expect;

import { db } from "dashboard/store";

import { Chunk } from "dashboard/chunk";
import { Schema } from "dashboard/schema";

describe("Schema", () => {
  let chunkOne: Chunk;
  let one: Schema;

  before(async () => {
    const chunks =  await Promise.all(
      [Chunk.makeChunk(new File(["schema content"], "a"))]);
    await Promise.all(chunks.map((x) => db.chunks.put(x)));
    [chunkOne] = chunks;
    one = new Schema("a", chunkOne.id);
  });

  after(() => db.delete().then(() => db.open()));

  it("#recordType is 'Schema'",
     async () => expect(one.recordType).to.equal("Schema"));

  it("#chunk is correct",
     async () => expect(one.chunk).to.equal(chunkOne.id));

  it("#data is correct",
     async () => expect(await one.getData()).to.equal("schema content"));
});
