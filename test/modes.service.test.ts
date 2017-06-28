import "chai";
import "chai-as-promised";
import "mocha";

const expect = chai.expect;

import { ModesService } from "dashboard/modes.service";

describe("ModesService", () => {
  // There is not a lot to gain from trying to test this in more details.
  it("modes provides a list of modes", () => {
    const service = new ModesService();
    const modes = service.modes;
    expect(modes).to.have.length.above(0);
  });

  it("takes a list of additional modes", () => {
    const plain = new ModesService();
    const plainLength = plain.modes.length;
    const service = new ModesService([{ name: "foo", path: "foo/foo" }]);
    const modes = service.modes;
    expect(modes).to.have.lengthOf(plainLength + 1);
    expect(service.modeToPath("foo")).to.equal("foo/foo");
    expect(service.pathToMode("foo/foo")).to.equal("foo");
  });
});
