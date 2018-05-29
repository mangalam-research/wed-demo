import "chai";
import "mocha";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);

const expect = chai.expect;

import { ComponentFixture, ComponentFixtureAutoDetect,
         TestBed } from "@angular/core/testing";
import { Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { ClearStoreComponent } from "dashboard/clear-store.component";
import { ConfirmService } from "dashboard/confirm.service";
import { PacksService } from "dashboard/packs.service";
import { ProcessingService } from "dashboard/processing.service";
import { UploadComponent } from "dashboard/upload.component";
import { XMLFile } from "dashboard/xml-file";
import { XMLFilesService } from "dashboard/xml-files.service";
import { XMLFilesComponent } from "dashboard/xml-files/xml-files.component";
import { expectReject, waitFor, waitForSuccess } from "./util";

//
// We use any a lot in this code. There's little benefit with doing away with
// it.
//
// tslint:disable:no-any

// tslint:disable:no-empty
class FakeProcessingService {
  start(_total: number): void {}

  increment(): void {}

  stop(): void {}
}
// tslint:enable:no-empty

describe("GenericRecordsComponent", () => {
  // Since it is a generic, we test it through XMLFilesComponent.
  let component: XMLFilesComponent;
  let fixture: ComponentFixture<XMLFilesComponent>;
  let recordsService: XMLFilesService;
  let fakeConfirmer: sinon.SinonStub;
  let records: XMLFile[];
  let router: Router;

  beforeEach(async () => {
    fakeConfirmer = sinon.stub();
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
      ],
      declarations: [ ClearStoreComponent, UploadComponent, XMLFilesComponent ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        ChunksService,
        ConfirmService,
        { provide: ProcessingService, useClass: FakeProcessingService },
        XMLFilesService,
        PacksService,
        { provide: "Confirmer", useValue: fakeConfirmer },
      ],
    });

    await TestBed.compileComponents();
    recordsService = TestBed.get(XMLFilesService);
    router = TestBed.get(Router);
    records = await Promise.all(
      [{name: "a", data: "foo"},
       {name: "b", data: "foo b"}]
        .map(async (x) => {
          const record = await recordsService.makeRecord(x.name, x.data);
          return recordsService.updateRecord(record);
        }));

    fixture = TestBed.createComponent(XMLFilesComponent);
    component = fixture.componentInstance;

    // Wait until the component has refreshed.
    await waitFor(() => component.records != null &&
                  component.records.length !== 0);
    return fixture.whenStable();
  });

  afterEach(() => {
    sinon.restore();
    fixture.detectChanges();
    return fixture.whenStable()
      .then(() => {
        fixture.destroy();
      })
      .then(() => db.delete())
      .then(() => db.open());
  });

  describe("#del", () => {
    it("asks for a confirmation", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      await component.del(records[0]);
      expect(fakeConfirmer.callCount).to.equal(1);
    });

    it("deletes if the user confirmed", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      await component.del(records[0]);
      return waitForSuccess(() => expect(component.records).to.have.length(1));
    });

    it("does not delete if the user answered negatively", async () => {
      fakeConfirmer.returns(Promise.resolve(false));
      await component.del(records[0]);
      expect(component.records).to.have.length(2);
    });
  });

  describe("#download", () => {
    it("triggers a download with the right data", async () => {
      const stub = sinon.stub(component, "triggerDownload" as any);
      await component.download(records[0]);
      expect(stub).to.have.been.calledWith("a", "foo");
    });
  });

  // #triggerDownload cannot be tested here.

  describe("#upload", () => {
    it("is a no-op if there are no files", async () => {
      const stub = sinon.stub(recordsService, "safeLoadFromFile");
      await component.upload(records[0], {
        target: {
          files: undefined,
        },
      } as any);
      expect(stub).to.have.not.been.called;
      await component.upload(records[0], {
        target: {
          files: [],
        },
      } as any);
      expect(stub).to.have.not.been.called;
    });

    it("throws if there are more than one file", () =>
      expectReject(
        component.upload(records[0], {
          target: {
            files: [new File(["one"], "one"),
                    new File(["two"], "two")],
          },
        } as any),
        Error,
        /internal error: the upload control cannot be used for multiple files/),
      );

    it("replaces the record", async () => {
      await component.upload(records[0], {
         target: {
           files: [new File(["new data"], "new file")],
         },
      } as any);
      const record = await recordsService.getRecordById(records[0].id!);
      expect(await record!.getData()).to.equal("new data");
    });

    it("uses the processing service", async () => {
      const stub = sinon.stub(FakeProcessingService.prototype);
      await component.upload(records[0], {
        target: {
          files: [new File(["new data"], "new file")],
        },
      } as any);
      expect((stub as any).start).to.have.been.calledOnce;
      expect((stub as any).start).to.have.been.calledWith(1);
      expect((stub as any).increment).to.have.been.calledOnce;
      expect((stub as any).stop).to.have.been.calledOnce;
    });
  });

  describe("#showDetails", () => {
    it("changes the route to the record", () => {
      const stub = sinon.stub(router);
      component.showDetails(records[0]);
      expect((stub as any).navigate.firstCall)
        .to.have.been.calledWith([".", records[0].id],
                                 { relativeTo: (component as any).route });
    });
  });
});
