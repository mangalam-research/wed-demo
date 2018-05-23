import "chai";
import "mocha";

const expect = chai.expect;

import { Chunk } from "dashboard/chunk";

describe("Chunk", () => {
  let one: Chunk;
  let same: Chunk;
  let different: Chunk;

  before(() =>
         Promise.all([
           Chunk.makeChunk(new File(["content"], "name")),
           Chunk.makeChunk(new File(["content"], "foo")),
           Chunk.makeChunk(new File(["different"], "name")),
         ])
         .then(([first, second, third]) => {
           one = first;
           same = second;
           different = third;
         }));

  it("has recordType which is 'Chunk'",
     async () => expect(one.recordType).to.equal("Chunk"));

  it("has a defined id",
     async () => expect(one).to.have.property("id").not.be.undefined);

  it("has the right content",
     async () => expect(await one.getData()).to.equal("content"));

  it("two chunks have the same id for the same content",
     async () => expect(one.id).to.equal(same.id));

  it("two chunks have different ids for different content",
     async () => expect(one.id).to.not.equal(different.id));

  it("can be created from a string", async () => {
    const chunk = await Chunk.makeChunk("string");
    expect(await chunk.getData()).to.equal("string");
  });
});
