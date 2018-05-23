import "chai";
import "mocha";
import * as sinon from "sinon";

const expect = chai.expect;

import { DataProvider } from "./util";

import { db } from "dashboard/store";

import { ConfirmService } from "dashboard/confirm.service";
import { UpgradeService } from "dashboard/upgrade.service";

describe("UpgradeService", () => {
  let service: UpgradeService;
  let sandbox: sinon.SinonSandbox;
  let fakeAlert: sinon.SinonStub;
  let downloadStub: sinon.SinonStub;
  let confirmService: ConfirmService;
  let provider: DataProvider;

  before(() => {
    provider = new DataProvider("/base/test/data/");
  });

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    fakeAlert = sandbox.stub();
    fakeAlert.returns(Promise.resolve());
    confirmService = new ConfirmService(undefined, undefined, fakeAlert);
    service = new UpgradeService(confirmService);
    downloadStub = sandbox.stub(service, "download").returns(Promise.resolve());
    sandbox.stub(service, "reload");
  });

  afterEach(() => {
    sandbox.restore();
  });

  afterEach(() => db.delete().then(() => db.open()));

  it("does not act if there is no need for an upgrade", () =>
     service.upgrade().then(() => {
       expect(fakeAlert).to.not.have.been.called;
       expect(service.download).to.not.have.been.called;
       expect(service.reload).to.not.have.been.called;
     }));

  describe("when there is a need for an upgrade", () => {
    let data: string;

    before(() => provider.getText("database-data-with-v1-pack.json")
           .then((json) => {
             data = json;
           }));

    beforeEach(() => db.load(data));

    it("alerts about the upgrade", () =>
       service.upgrade()
       .then(() => {
         expect(fakeAlert).to.have.been.calledTwice;
         expect(fakeAlert.firstCall).to.have.been
           .calledWithMatch(sinon.match(/^The database must be upgraded/));
       }));

    it("reloads the application", () =>
       service.upgrade()
       .then(() => {
         expect(fakeAlert).to.have.been.calledTwice;
         expect(fakeAlert.secondCall).to.have.been
           .calledWithMatch(sinon.match(/^We will now reload/));
         expect(service.reload).to.have.been.calledOnce;
       }));

    it("downloads a backup", () =>
       service.upgrade()
       .then(() => {
         expect(fakeAlert).to.have.been.calledTwice;
         expect(service.download).to.have.been.calledOnce;
       }));

    it("reports any fatal error", () => {
      downloadStub.throws(new Error("foo"));
      return service.upgrade()
        .then(() => {
          expect(fakeAlert).to.have.been.calledTwice;
          expect(fakeAlert.secondCall).to.have.been
            .calledWithMatch(sinon.match(/^The upgrade failed!/));
        });
    });
  });
});
