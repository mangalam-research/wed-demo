import "chai";
import "chai-as-promised";
import "mocha";

const expect = chai.expect;

import { Pack } from "dashboard/pack";

describe("Pack", () => {
  // tslint:disable-next-line:mocha-no-side-effect-code
  const one = new Pack("a");

  it("has recordType which is 'Pack'",
     () => expect(one.recordType).to.equal("Pack"));

  it("takes a payload",
     () => {
       const payload = {
         schema: "a",
         mode: "b",
         metadata: "d",
       };

       const b = new Pack("b", payload);
       const { schema, mode, metadata } = b;
       expect({ schema, mode, metadata }).to.deep.equal(payload);
     });
});
