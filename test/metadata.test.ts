import "chai";
import "mocha";

const expect = chai.expect;

import { db } from "dashboard/store";

import { Chunk } from "dashboard/chunk";
import { Metadata } from "dashboard/metadata";

describe("Metadata", () => {
  // tslint:disable-next-line:mocha-no-side-effect-code
  const content = JSON.stringify({
    generator: "gen1",
    date: "date1",
    version: "ver1",
    namespaces: {
      foo: "foouri",
      bar: "baruri",
    },
  });

  // tslint:disable-next-line:mocha-no-side-effect-code
  const different = JSON.stringify({
    generator: "gen2",
    date: "date2",
    version: "ver2",
    namespaces: {
      foo: "foouri",
      bar: "baruri",
    },
  });

  let contentChunk: Chunk;
  let differentChunk: Chunk;

  let metadata1: Metadata;

  before(async () => {
    const chunks  = await Promise.all(
      [Chunk.makeChunk(new File([content], "a")),
       Chunk.makeChunk(new File([different], "b"))]);
    await Promise.all(chunks.map((x) => db.chunks.put(x)));
    [contentChunk, differentChunk] = chunks;
    metadata1 = new Metadata("a", contentChunk);
  });

  after(() => db.delete().then(() => db.open()));

  it("instances have a Metadata type",
     async () => expect(metadata1.recordType).to.equal("Metadata"));

  it("to have a generator value which is extracted from the data",
     async () => expect(await metadata1.getGenerator()).to.equal("gen1"));

  it("to have a creationDate which is extracted from the data",
     async () => expect(await metadata1.getCreationDate()).to.equal("date1"));

  it("to have a version which is extracted from the data",
     async () => expect(await metadata1.getVersion()).to.equal("ver1"));

  it("to have namespaces extracted from the data",
     async () => expect(await metadata1.getNamespaces()).to.deep.equal({
       foo: "foouri",
       bar: "baruri",
     }));

  it("to have prefixNamespacePairs extracted from the data",
     async () => expect(await metadata1.getPrefixNamespacePairs())
     .to.deep.equal([
       {
         prefix: "foo",
         uri: "foouri",
       },
       {
         prefix: "bar",
         uri: "baruri",
       },
     ]));

  it("setting the chunk changes the data", async () => {
    metadata1.chunk = differentChunk.id;
    expect(await metadata1.getGenerator()).to.equal("gen2");
  });
});
