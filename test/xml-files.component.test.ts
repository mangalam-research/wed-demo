import "chai";
import "chai-as-promised";
import "mocha";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);

const expect = chai.expect;

import { DebugElement } from "@angular/core";
import { ComponentFixture, ComponentFixtureAutoDetect,
         TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { Router } from "@angular/router";

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { ClearStoreComponent } from "dashboard/clear-store.component";
import { ConfirmService } from "dashboard/confirm.service";
import { Pack } from "dashboard/pack";
import { PacksService } from "dashboard/packs.service";
import { ProcessingService } from "dashboard/processing.service";
import { UploadComponent } from "dashboard/upload.component";
import { XMLFile } from "dashboard/xml-file";
import { XMLFilesComponent } from "dashboard/xml-files.component";
import { XMLFilesService } from "dashboard/xml-files.service";

import { ComponentTestState, eventTests,
         renderTests } from "./common-component.tests";
import { DataProvider, expectReject, waitFor, waitForSuccess } from "./util";

// tslint:disable: no-empty
class RouterStub {
  // tslint:disable-next-line:no-any
  navigate(..._args: any[]): any {}
}

class FakeProcessingService {
  start(_total: number): void {}

  increment(): void {}

  stop(): void {}
}
// tslint:enable

describe("XMLFilesComponent", () => {
  let component: XMLFilesComponent;
  let fixture: ComponentFixture<XMLFilesComponent>;
  let de: DebugElement;
  let el: HTMLElement;
  let sandbox: sinon.SinonSandbox;
  let packsService: PacksService;
  let recordsService: XMLFilesService;
  let fakeConfirmer: sinon.SinonStub;
  let fakePrompter: sinon.SinonStub;
  let records: XMLFile[];
  let provider: DataProvider;
  let packA: string;

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

  // tslint:disable-next-line:mocha-no-side-effect-code
  const state: ComponentTestState = Object.create(null);

  before(async () => {
    provider = new DataProvider("/base/test/data/");
    const schema = await provider.getText("doc-annotated.js");
    const packAUnserialized = {
      name: "foo",
      interchangeVersion: 1,
      schema,
      metadata,
      mode: "generic",
      match: {
        method: "top-element",
        localName: "",
        namespaceURI: "",
      },
    };

    packA = JSON.stringify(packAUnserialized);
  });

  beforeEach(async () => {
    sandbox = sinon.sandbox.create();
    fakeConfirmer = sandbox.stub();
    fakeConfirmer.returns(Promise.resolve(true));
    fakePrompter = sandbox.stub();
    TestBed.configureTestingModule({
      declarations: [ ClearStoreComponent, UploadComponent, XMLFilesComponent ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        ChunksService,
        ConfirmService,
        { provide: ProcessingService, useClass: FakeProcessingService },
        XMLFilesService,
        PacksService,
        { provide: "Confirmer", useValue: fakeConfirmer },
        { provide: "Prompter", useValue: fakePrompter },
        { provide: Router, useClass: RouterStub }],
    });

    await TestBed.compileComponents();
    packsService = TestBed.get(PacksService);
    recordsService = TestBed.get(XMLFilesService);

    let pack = await packsService.saveNewRecord("", packA);
    pack = await packsService.updateRecord(pack);

    records = await Promise.all(
      ([{name: "a", data: "<q/>", pack: pack.id},
       {name: "b", data: "<q/>"},
       {name: "c", data:
        "<doc xmlns='http://mangalamresearch.org/ns/mmwp/doc'/>" }] as
       { name: string, data: string, pack?: number }[])
        .map(async (x) => {
          const record = await recordsService.makeRecord(x.name, x.data);
          record.pack = x.pack;
          return recordsService.updateRecord(record);
        }));

    fixture = TestBed.createComponent(XMLFilesComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement.query(By.css("div"));
    el = de.nativeElement;
    state.component = component;
    state.fixture = fixture;
    state.el = el;
    state.recordsService = recordsService;
    state.sandbox = sandbox;
    // Wait until the component has refreshed.
    await waitFor(() => component.records != null &&
                  component.records.length !== 0);
    return fixture.whenStable();
  });

  afterEach(() => db.delete().then(() => db.open()));

  function makeNavigationURL(record: XMLFile, pack: Pack): string {
    const ls = recordsService.makeIndexedDBURL(record);
    const packUrl = packsService.makeIndexedDBURL(pack);
    const management = document.location.href;
    return `../kitchen-sink.html?nodemo=1&localstorage=${ls}\
&pack=${packUrl}&management=${management}`;
  }

  describe("#download", () => {
    it("updates the download date", async () => {
      expect(component.records[0].downloaded).to.equal("never");
      await component.download(component.records[0]);
      expect(component.records[0].downloaded).to.not.equal("never");
    });
  });

  describe("#edit", () => {
    let goToStub: sinon.SinonStub;
    beforeEach(() => {
      goToStub = sandbox.stub(component, "goTo");
    });

    it("fails if the file has no pack associated with it", async () => {
      const record = await recordsService.getRecordByName("b");
      await expectReject(component.edit(record!), Error,
                         /^edit launched on file without a pack/);
      expect(goToStub.callCount).to.equal(0);
    });

    it("fails if the the pack is missing", async () => {
      const stub = sandbox.stub(packsService, "getRecordById");
      stub.returns(Promise.resolve(undefined));
      component.records[0].pack = -999;
      await expectReject(component.edit(component.records[0]),
                         Error, /cannot load pack: -999/);
      expect(goToStub.callCount).to.equal(0);
    });

    it("navigates if the file is fine", async () => {
      const record = await recordsService.getRecordByName("a");
      expect(record).to.not.be.undefined;
      expect(record!.pack).to.not.be.undefined;
      const pack = await packsService.getRecordById(record!.pack!);
      await component.edit(record!);
      expect(goToStub).to.have.been.calledOnce;
      expect(goToStub.firstCall).to.have.been.calledWith(
        makeNavigationURL(record!, pack!));
    });
  });

  describe("#newFile", () => {
    it("prompts for a name", async () => {
      fakePrompter.returns(Promise.resolve(""));
      await component.newFile();
      expect(fakePrompter.callCount).to.equal(1);
    });

    it("is a no-op if the file name is the empty string", async () => {
      fakePrompter.returns(Promise.resolve(""));
      const writeStub = sandbox.stub(recordsService, "writeCheck");
      const updateSpy = sandbox.stub(recordsService, "updateRecord");
      await component.newFile();
      expect(fakePrompter.callCount).to.equal(1);
      expect(writeStub.callCount).to.equal(0);
      expect(updateSpy.callCount).to.equal(0);
    });

    it("is a no-op if the write check is negative", async () => {
      fakePrompter.returns(Promise.resolve(records[0].name));
      const writeStub = sandbox.stub(recordsService, "writeCheck");
      const updateSpy = sandbox.stub(recordsService, "updateRecord");
      writeStub.returns(Promise.resolve({ write: false, record: null }));
      await component.newFile();
      expect(writeStub.callCount).to.equal(1);
      expect(updateSpy.callCount).to.equal(0);
    });

    it("saves the file if write check is positive", async () => {
      fakePrompter.returns(Promise.resolve(records[0].name));
      const writeStub = sandbox.stub(recordsService, "writeCheck");
      const updateSpy = sandbox.spy(recordsService, "updateRecord");
      writeStub.returns(Promise.resolve({ write: true, record: records[0] }));
      await component.newFile();
      expect(writeStub.callCount).to.equal(1);
      expect(updateSpy.callCount).to.equal(1);
      return expect(recordsService.getRecordByName(records[0].name)
                    .then((record) => record!.getData()))
        .to.eventually.equal("");
    });
  });

  describe("#getEditingData()", () => {
    function isCached(fn: Function): void {
      expect(fn()).to.equal(fn());
    }

    describe("#editable", () => {
      it("returns false when the record has nopack", async () => {
        const record = await recordsService.getRecordByName("b");
        return expect(component.getEditingData(record!).editable())
          .to.eventually.be.false;
      });

      it("returns true when the record has a pack", async () => {
        const record = await recordsService.getRecordByName("a");
        return expect(component.getEditingData(record!).editable())
          .to.eventually.be.true;
      });

      it("caches its promise", async () => {
        const record = await recordsService.getRecordByName("a");
        isCached(() => component.getEditingData(record!).editable());
      });
    });

    describe("#editingDisabled", () => {
      it("returns an empty string when the record has nopack", async () => {
        const record = await recordsService.getRecordByName("b");
        return expect(component.getEditingData(record!).editingDisabled())
          .to.eventually.equal("");
      });

      it("returns ``null`` when the record has a pack", async () => {
        const record = await recordsService.getRecordByName("a");
        return expect(component.getEditingData(record!).editingDisabled())
          .to.eventually.be.null;
      });

      it("caches its promise", async () => {
        const record = await recordsService.getRecordByName("a");
        isCached(() => component.getEditingData(record!).editingDisabled());
      });
    });

    describe("#editButtonTitle", () => {
      it("returns the correct title when the record has no pack", async () => {
        const record = await recordsService.getRecordByName("b");
        return expect(component.getEditingData(record!).editButtonTitle())
          .to.eventually.equal("This file needs a pack before editing.");
      });

      it("returns the correct title when the record has a pack", async () => {
        const record = await recordsService.getRecordByName("a");
        return expect(component.getEditingData(record!).editButtonTitle())
          .to.eventually.equal("Edit");
      });

      it("caches its promise", async () => {
        const record = await recordsService.getRecordByName("a");
        isCached(() => component.getEditingData(record!).editButtonTitle());
      });
    });

    describe("#getPack", () => {
      it("returns undefined the record has no pack", async () => {
        const record = await recordsService.getRecordByName("b");
        return expect(component.getEditingData(record!).getPack())
          .to.eventually.be.undefined;
      });

      it("returns the pack when the record has a manual pack", async () => {
        const record = (await recordsService.getRecordByName("a"))!;
        expect((await component.getEditingData(record).getPack())!.id)
          .to.equal(record.pack);
      });
    });
  });

  // tslint:disable-next-line:mocha-no-side-effect-code
  renderTests.make(state);

  describe("renders HTML", () => {
    it("displays record information", () => {
      const trs = el.getElementsByTagName("tr");
      const tr = trs[1]; // Indexed at 1 to skip the header.

      const record = component.records[0];
      const tds = tr.getElementsByTagName("td");
      expect(tds[1].textContent).to.equal(record.name);
      expect(tds[2].textContent).to.equal("never");
      expect(tds[3].textContent).to.not.equal("never");
      expect(tds[3].textContent).to.not.equal("");
      expect(tds[4].textContent).to.equal("never");
    });

    it("records without a pack have their edit button disabled", async () => {
      const trs = el.getElementsByTagName("tr");
      let sawDisabled = 0;
      let sawEnabled = 0;
      let recordIndex = 0;
      for (const tr of Array.from(trs).slice(1)) {
        const editButton = tr.querySelector(".btn.edit-button")!;
        const record = component.records[recordIndex];
        const shouldBeDisabled =
          (await component.getEditingData(record).getPack()) === undefined;

        if (shouldBeDisabled) {
          sawDisabled++;
          expect(editButton.getAttribute("disabled")).to.not.be.null;
        }
        else {
          sawEnabled++;
          expect(editButton.getAttribute("disabled")).to.be.null;
        }
        expect(editButton.getAttribute("title"))
          .to.equal(shouldBeDisabled ?
                    "This file needs a pack before editing." :
                    "Edit");
        recordIndex++;
      }

      // Make sure we've covered both cases.
      expect(sawDisabled).to.be.greaterThan(0);
      expect(sawEnabled).to.be.greaterThan(0);
    });
  });

  // tslint:disable-next-line:mocha-no-side-effect-code
  eventTests.make(state);

  describe("handles events:", () => {
    it("navigates to the editor when edit button is clicked", async () => {
      const goToStub = sandbox.stub(component, "goTo");
      const pack = await packsService.getRecordById(component.records[0].pack!);
      const editButton =
        el.querySelector(".btn.edit-button")! as HTMLAnchorElement;
      expect(editButton.getAttribute("disabled")).to.be.null;
      editButton.click();
      await waitForSuccess(() => expect(goToStub.callCount).to.equal(1));
      expect(goToStub.firstCall.calledWith(
        makeNavigationURL(component.records[0], pack!))).to.be.ok;
    });
  });
});
