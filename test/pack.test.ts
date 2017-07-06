import "chai";
import "chai-as-promised";
import "mocha";

const expect = chai.expect;

import { Pack, PackPayload } from "dashboard/pack";

describe("Pack", () => {
  // tslint:disable-next-line:mocha-no-side-effect-code
  const one = new Pack("a");

  it("has recordType which is 'Pack'",
     () => expect(one.recordType).to.equal("Pack"));

  it("takes a payload",
     () => {
       const payload: PackPayload = {
         schema: "a",
         mode: "b",
         metadata: "d",
         match: {
           method: "top-element",
           localName: "",
           namespaceURI: "",
         },
       };

       const b = new Pack("b", payload);
       const { schema, mode, metadata, match } = b;
       expect({ schema, mode, metadata, match }).to.deep.equal(payload);
     });
});
