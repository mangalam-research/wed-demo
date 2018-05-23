import "chai";
import "mocha";

const expect = chai.expect;

// RecordCommon is an abstract class. We'll test it through XMLFile.
import { XMLFile } from "dashboard/xml-file";

describe("RecordCommon", () => {
  let one: XMLFile;

  before(() => {
    one = new XMLFile("a", "xmlfile content");
  });

  it("starts with downloaded set to 'never'",
     async () => expect(one.downloaded).to.equal("never"));

  it("starts with uploaded set to a Date",
     async () => expect(one.uploaded).to.be.an.instanceof(Date));

  it("starts with a recordVersion set to 1",
     async () => expect(one.recordVersion).to.equal(1));

  it("starts with a notes as an empty string",
     async () => expect(one.notes).to.equal(""));
});
