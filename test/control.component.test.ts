import "chai";
import "mocha";
import * as sinon from "sinon";

const expect = chai.expect;

import { DebugElement } from "@angular/core";
import { ComponentFixture, ComponentFixtureAutoDetect,
         TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { ConfirmService } from "dashboard/confirm.service";
import { ControlComponent } from "dashboard/control/control.component";
import { MetadataService } from "dashboard/metadata.service";
import { PacksService } from "dashboard/packs.service";
import { ProcessingService } from "dashboard/processing.service";
import { SchemasService } from "dashboard/schemas.service";
import { UpgradeService } from "dashboard/upgrade.service";
import { XMLFilesService } from "dashboard/xml-files.service";
import { expectReject, waitForSuccess } from "./util";

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

// tslint:disable-next-line:max-func-body-length
describe("ControlComponent", () => {
  let component: ControlComponent;
  let fixture: ComponentFixture<ControlComponent>;
  let de: DebugElement;
  let el: HTMLElement;
  let sandbox: sinon.SinonSandbox;
  let packsService: PacksService;
  let xmlFilesService: XMLFilesService;
  let metadataService: MetadataService;
  let schemasService: SchemasService;
  let chunksService: ChunksService;
  let fakeConfirmer: sinon.SinonStub;

  // tslint:disable-next-line:mocha-no-side-effect-code
  const emptyDump = JSON.stringify({
                                     creationDate: new Date().toString(),
                                     interchangeVersion: 1,
                                     tables: {},
                                   });

  // tslint:disable-next-line:mocha-no-side-effect-code
  const metadata = JSON.stringify({
    generator: "gen1",
    date: "date1",
    version: "ver1",
    namespaces: {
      foo: "foouri",
      bar: "baruri",
    },
  });

  const packAUnserialized = {
    name: "foo",
    interchangeVersion: 1,
    schema: "aaa",
    metadata,
    mode: "generic",
    meta: "tei",
  };

  // tslint:disable-next-line:mocha-no-side-effect-code
  const packA = JSON.stringify(packAUnserialized);

  beforeEach(async () => {
    sandbox = sinon.createSandbox();
    fakeConfirmer = sandbox.stub();
    TestBed.configureTestingModule({
      declarations: [ ControlComponent ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: "Confirmer", useValue: fakeConfirmer },
        { provide: ProcessingService, useClass: FakeProcessingService },
        PacksService,
        XMLFilesService,
        MetadataService,
        SchemasService,
        ChunksService,
        ConfirmService,
        UpgradeService,
      ],
    });

    await TestBed.compileComponents();
    metadataService = TestBed.get(MetadataService);
    xmlFilesService = TestBed.get(XMLFilesService);
    packsService = TestBed.get(PacksService);
    schemasService = TestBed.get(SchemasService);
    chunksService = TestBed.get(ChunksService);

    const packPromises = [packA]
      .map((x) => packsService.makeRecord(packAUnserialized.name, x)
           .then((record) => packsService.updateRecord(record)));
    const metadataPromises =
      [metadataService.makeRecord("metadata", metadata)
       .then((record) => metadataService.updateRecord(record))];
    const xmlFilesPromises =
      [xmlFilesService.makeRecord("xml1", "<div/>")
       .then((record) => xmlFilesService.updateRecord(record))];
    const schemasPromises =
      [schemasService.makeRecord("schema1", "<schema/>")
       .then((record) => schemasService.updateRecord(record))];

    await Promise.all(([] as Promise<{}>[]).concat(packPromises,
                                                   metadataPromises,
                                                   xmlFilesPromises,
                                                   schemasPromises));
    fixture = TestBed.createComponent(ControlComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement.query(By.css("div"));
    el = de.nativeElement;
  });

  afterEach(() => {
    sandbox.restore();
    return db.delete().then(() => db.open());
  });

  async function dumpAndLoad(clear: boolean): Promise<void> {
    // We back dump the database, reload it and then compare.
    const dump = await component.dump();

    // Clear if requested...
    if (clear) {
      await Promise.all(db.tables.map((table) => table.clear()));
    }

    await component.load(dump);

    expect(await packsService.getRecordCount()).to.equal(1);
    expect(await xmlFilesService.getRecordCount()).to.equal(1);
    expect(await metadataService.getRecordCount()).to.equal(1);
    expect(await schemasService.getRecordCount()).to.equal(1);

    const xmlRecord = await xmlFilesService.getRecordByName("xml1");
    expect(xmlRecord!.name).to.equal("xml1");
    expect(await xmlRecord!.getData()).to.equal("<div/>");

    const schemaRecord = await schemasService.getRecordByName("schema1");
    expect(schemaRecord!.name).to.equal("schema1");
    expect(await schemaRecord!.getData()).to.equal("<schema/>");

    const packRecord = await packsService.getRecordByName("foo");
    expect(packRecord!.name).to.equal("foo");
    expect(packRecord!.mode).to.equal("generic");
    const schema = packRecord!.schema;
    const chunk = await chunksService.getRecordById(schema);
    expect(await chunk!.getData()).to.equal("aaa");

    const metadataRecord = await metadataService.getRecordByName("metadata");
    expect(metadataRecord!.name).to.equal("metadata");
    expect(await metadataRecord!.getData()).to.equal(metadata);
  }

  describe("#dump/#load", () => {
    // We test both with ``dumpAndLoad(true)`` and ``dumpAndLoad(false)`` to
    // catch different errors. If we tested only with ``true``, we'd miss a bug
    // whereby the load does not clear the database. If we tested only with
    // ``false`` we'd miss a bug whereby the load operation does nothing. (The
    // test would pass because the old data would be in the database still.)
    it("creates backups uploadable to restore an empty database", () =>
       dumpAndLoad(true));

    it("creates backups uploadable to restore a filled database", () =>
       dumpAndLoad(false));
  });

  describe("#load", () => {
    it("fails on bad data", () =>
       expectReject(component.load("{}"), Error,
                    "incorrect version number: undefined"));
  });

  describe("#download", () => {
    it("triggers a download with the right data", async () => {
      const stub = sandbox.stub(component, "triggerDownload");
      const dump = await component.dump();
      component.download();
      return waitForSuccess(
        () => expect(stub).to.have.been.calledWith("backup", dump));
    });
  });

  describe("#change", () => {
    it("is a no-op if there are no files", async () => {
      await component.change({
         target: {
           files: undefined,
         },
      } as any);

      expect(fakeConfirmer).to.have.not.been.called;

      await component.change({
        target: {
          files: [],
        },
      } as any);

      expect(fakeConfirmer).to.have.not.been.called;
    });

    it("throws if there are more than one file", () =>
       expectReject(
         component.change({
           target: {
             files: [new File(["one"], "one"),
                     new File(["two"], "two")],
           },
         } as any),
         Error,
         "internal error: the control cannot be used for multiple files"));

    it("asks for confirmation", async () => {
      fakeConfirmer.returns(Promise.resolve(false));
      await component.change({
        target: {
          files: [new File(["{}"], "x")],
        },
      } as any);

      expect(fakeConfirmer).to.have.been.called;
    });

    it("does not load if confirmation is denied", async () => {
      fakeConfirmer.returns(Promise.resolve(false));
      const stub = sandbox.stub(component, "load");
      await component.change({
        target: {
          files: [new File(["{}"], "x")],
        },
      } as any);

      expect(fakeConfirmer).to.have.been.called;
      expect(stub).to.not.have.been.called;
    });

    it("loads if confirmation is given", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      const stub = sandbox.stub(component, "load");
      await component.change({
        target: {
          files: [new File([emptyDump], "x")],
        },
      } as any);

      expect(fakeConfirmer).to.have.been.called;
      expect(stub).to.have.been.called;
    });

    it("replaces the data", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      await component.change({
        target: {
          files: [new File([emptyDump], "x")],
        },
      } as any);

      expect(await packsService.getRecordCount()).to.equal(0);
      expect(await xmlFilesService.getRecordCount()).to.equal(0);
      expect(await metadataService.getRecordCount()).to.equal(0);
      expect(await schemasService.getRecordCount()).to.equal(0);
    });

    it("uses the processing service", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      const stub = sandbox.stub(FakeProcessingService.prototype);
      await component.change({
        target: {
          files: [new File([emptyDump], "x")],
        },
      } as any);

      expect(fakeConfirmer).to.have.been.calledOnce;
      expect((stub as any).start).to.have.been.calledOnce;
      expect((stub as any).start).to.have.been.calledWith(1);
      expect((stub as any).increment).to.have.been.calledOnce;
      expect((stub as any).stop).to.have.been.calledOnce;
    });

    it("shows an alert if the data is incorrect", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      const stub = sandbox.stub(FakeProcessingService.prototype);
      await component.change({
        target: {
          files: [new File(["{}"], "x")],
        },
      } as any);

      expect(fakeConfirmer).to.have.been.calledOnce;
      expect((stub as any).start).to.have.been.calledOnce;
      expect((stub as any).start).to.have.been.calledWith(1);
      // Increment is not called due to the error.
      expect((stub as any).increment).to.not.have.been.called;
      expect((stub as any).stop).to.have.been.calledOnce;
      expect(document.getElementsByClassName("bootbox-alert"))
        .to.have.property("length").greaterThan(0);
    });
  });

  describe("#clear", () => {
    it("asks for confirmation", async () => {
      fakeConfirmer.returns(Promise.resolve(false));
      await component.clear();
      expect(fakeConfirmer).to.have.been.called;
    });

    it("does not clear if confirmation is denied", async () => {
      fakeConfirmer.returns(Promise.resolve(false));
      await component.clear();
      expect(fakeConfirmer).to.have.been.called;
      expect(await packsService.getRecordCount()).to.equal(1);
    });

    it("clears if confirmation is given", async () => {
      fakeConfirmer.returns(Promise.resolve(true));
      expect(await packsService.getRecordCount()).to.not.equal(0);
      await component.clear();
      expect(fakeConfirmer).to.have.been.called;
      expect(await packsService.getRecordCount()).to.equal(0);
    });
  });

  describe("handles events:", () => {
    it("initiates a download when the download button is clicked", () => {
      const downloadStub = sandbox.stub(component, "triggerDownload");
      const downloadButton =
        el.querySelector(".btn.download-button")! as HTMLAnchorElement;
      downloadButton.click();
      fixture.detectChanges();
      return waitForSuccess(() => expect(downloadStub).to.have.been.calledOnce);
    });

    // We cannot test the upload support here. There is no way to fill an
    // input with type="file" with actual files. We can blank such element
    // (el.value = "").

    it("initiates a clear operation when the clear button is clicked", () => {
      fakeConfirmer.returns(Promise.resolve(false));
      const clearStub = sandbox.stub(component, "clear");
      const clearButton =
        el.querySelector(".btn.clear-button")! as HTMLAnchorElement;
      clearButton.click();
      fixture.detectChanges();
      return waitForSuccess(() => expect(clearStub).to.have.been.calledOnce);
    });
  });
});
