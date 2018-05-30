import "chai";
import "mocha";
import { elementAt } from "rxjs/operators";

const expect = chai.expect;

import { ProcessingService } from "dashboard/processing.service";

describe("ProcessingService", () => {
  let service: ProcessingService;
  before(() => {
    service = new ProcessingService();
  });

  afterEach(() => {
    service.stop();
  });

  describe("#start", () => {
    it("fails when called with 0", async () =>
       expect(() => {
         service.start(0);
       }).to.throw(Error, /cannot start processing with a total of 0/));

    it("fails when already started", async () => {
      service.start(10);
      expect(() => {
        service.start(10);
      }).to.throw(Error, /there is already something in progress/);
    });

    it("emits a change", async () => {
      // elementAt(1): we need to skip the default that is automatically emitted
      // on subscription.
      const ret = service.state.pipe(elementAt(1)).toPromise();
      service.start(10);
      expect(await ret).to.deep.equal({ total: 10, count: 0 });
    });
  });

  describe("#stop", () => {
    it("emits a change", async () => {
      service.start(10);
      // elementAt(1): we need to skip the default that is automatically emitted
      // on subscription.
      const ret = service.state.pipe(elementAt(1)).toPromise();
      service.stop();
      expect(await ret).to.deep.equal({ total: 0, count: 0 });
    });
  });

  describe("#increment", () => {
    it("fails when called and nothing is in progress", async () =>
       expect(() => {
         service.increment();
       }).to.throw(Error,
                   /increment called when there is nothing in progress/));

    it("fails when incrementing beyond the total", () => {
      service.start(1);
      service.increment();
      expect(() => {
        service.increment();
      }).to.throw(Error, /incrementing beyond the total/);
    });

    it("emits a change", () => {
      const total = 3;
      service.start(total);
      // elementAt(1): we need to skip the default that is automatically emitted
      // on subscription.
      async function test(index: number): Promise<void> {
        const p = service.state.pipe(elementAt(1)).toPromise();
        service.increment();
        expect(await p).to.deep.equal({ total, count: index });
        if (index < total) {
          return test(index + 1);
        }

        return undefined;
      }

      return test(1);
    });
  });
});
