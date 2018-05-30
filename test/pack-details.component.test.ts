import "chai";
import "mocha";
import * as sinon from "sinon";
import * as sinonChai from "sinon-chai";

chai.use(sinonChai);

const expect = chai.expect;
import { Location } from "@angular/common";
import { DebugElement,
         Injectable } from "@angular/core";
import { ComponentFixture, ComponentFixtureAutoDetect,
         TestBed } from "@angular/core/testing";
import { AbstractControl, FormBuilder, FormsModule,
         ReactiveFormsModule } from "@angular/forms";
import { By } from "@angular/platform-browser";
import { BrowserDynamicTestingModule,
       } from "@angular/platform-browser-dynamic/testing";
import { ActivatedRoute, convertToParamMap, ParamMap,
         Router } from "@angular/router";
import { RouterTestingModule } from "@angular/router/testing";
import { BehaviorSubject, Observable } from "rxjs";
import { first } from "rxjs/operators";

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { ClearStoreComponent } from "dashboard/clear-store.component";
import { DialogChoiceComponent } from "dashboard/dialog-choice.component";
import { MetadataService,
         NameIdArray as MetadataNameIdArray } from "dashboard/metadata.service";
import { ModesService } from "dashboard/modes.service";
import { Pack } from "dashboard/pack";
import { PacksService } from "dashboard/packs.service";
import { PackDetailsComponent } from "dashboard/packs/pack-details.component";
import { NameIdArray as SchemaNameIdArray,
         SchemasService } from "dashboard/schemas.service";
import { UploadComponent } from "dashboard/upload.component";

// import { waitForSuccess } from "./util";

async function awaitFormValidation(
  fixture: ComponentFixture<PackDetailsComponent>): Promise<void> {
  const component = fixture.componentInstance;
  const form = component.form;

  // We have to manually wait. See:
  // https://github.com/angular/angular/issues/15486
  if (form.pending) {
    await form.statusChanges.pipe(first(() => !form.pending)).toPromise();
  }
  fixture.detectChanges();
  await fixture.whenStable();
}

@Injectable()
class ActivatedRouteStub {
  private readonly subject: BehaviorSubject<ParamMap> =
    new BehaviorSubject(this.testParamMap);
  readonly paramMap: Observable<ParamMap> = this.subject.asObservable();

  private _testParamMap: ParamMap = convertToParamMap({});
  get testParamMap(): ParamMap {
    return this._testParamMap;
  }

  set params(params: {}) {
    this._testParamMap = convertToParamMap(params);
    this.subject.next(this._testParamMap);
  }

  // ActivatedRoute.snapshot.paramMap
  get snapshot(): { paramMap: ParamMap } {
    return { paramMap: this.testParamMap };
  }
}

// tslint:disable-next-line:max-func-body-length
describe("PackDetailsComponent", () => {
  let component: PackDetailsComponent;
  let fixture: ComponentFixture<PackDetailsComponent>;
  let de: DebugElement;
  let el: HTMLElement;
  let packsService: PacksService;
  let modesService: ModesService;
  let schemasService: SchemasService;
  let metadataService: MetadataService;
  let records: Pack[];
  let router: Router;
  let activatedRoute: ActivatedRouteStub;

  // tslint:disable-next-line:mocha-no-side-effect-code
  const metadataSerialized = JSON.stringify({
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
    metadata: metadataSerialized,
    mode: "generic",
    match: {
      localName: "local",
      namespaceURI: "uri",
    },
  };

  const packBUnserialized = {
    name: "b",
    interchangeVersion: 1,
    schema: "aaa",
    metadata: metadataSerialized,
    mode: "generic",
  };

  beforeEach(async () => {
    activatedRoute = new ActivatedRouteStub();
    await TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        FormsModule,
        ReactiveFormsModule,
      ],
      declarations: [ ClearStoreComponent, UploadComponent,
                      PackDetailsComponent, DialogChoiceComponent ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        { provide: ActivatedRoute, useValue: activatedRoute },
        ModesService,
        ChunksService,
        FormBuilder,
        PacksService,
        MetadataService,
        SchemasService,
        Location,
      ],
    }).overrideModule(BrowserDynamicTestingModule, {
      set: {
        entryComponents: [DialogChoiceComponent],
      },
    }).compileComponents();

    router = TestBed.get(Router);
    packsService = TestBed.get(PacksService);
    modesService = TestBed.get(ModesService);
    schemasService = TestBed.get(SchemasService);
    metadataService = TestBed.get(MetadataService);

    records = await Promise.all(
      [packAUnserialized, packBUnserialized].map(
        async (x) => {
          const clone = JSON.parse(JSON.stringify(x));
          clone.mode = modesService.modeToPath(x.mode);
          return packsService.updateRecord(
            await packsService.makeRecord("", JSON.stringify(clone)));
        }));

    await Promise.all(
      [{ name: "a", data: "foo" },
       { name: "b", data: "bar" }]
        .map(async (x) => schemasService
             .updateRecord(await schemasService.makeRecord(x.name, x.data))));

    await Promise.all(
          [{ name: "a", data: "foo" },
           { name: "b", data: "bar" }]
        .map(async (x) => metadataService
             .updateRecord(await metadataService.makeRecord(x.name, x.data))));
  });

  afterEach(async () => {
    sinon.restore();
    if (fixture !== undefined) {
      fixture.detectChanges();
      await fixture.whenStable();
      fixture.destroy();
      // tslint:disable-next-line:no-any
      (fixture as any) = undefined; // Yes, we cheat to undefine it.
    }

    await db.delete();
    await db.open();
  });

  async function createComponent(id: string | number): Promise<void> {
    if (id !== undefined) {
      activatedRoute.params = {
        id: typeof id === "string" ? id : String(id),
      };
    }
    fixture = TestBed.createComponent(PackDetailsComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement.query(By.css("div"));
    el = de.nativeElement;

    const stub = sinon.stub(component, "openTabWithData");
    stub.returns(window);

    // Wait for the first routing to be done.
    await component.form.valueChanges.pipe(first()).toPromise();
    await fixture.whenStable();
  }

  describe("#hasSchema's observable", () => {
    it("becomes true when there is a schema", async () => {
      await createComponent("new");
      const field = component.form.get("schema")!;

      expect(field.value).to.be.null;
      expect(await component.hasSchema().pipe(first()).toPromise()).to.be.false;

      field.setValue(records[0].schema);

      expect(await component.hasSchema().pipe(first()).toPromise()).to.be.true;
    });

    it("becomes false when there is no schema", async () => {
      await createComponent(records[0].id!);

      const field = component.form.get("schema")!;

      expect(field.value).to.not.be.null;
      expect(await component.hasSchema().pipe(first()).toPromise()).to.be.true;

      field.setValue(null);

      expect(await component.hasSchema().pipe(first()).toPromise()).to.be.false;
    });
  });

  describe("#hasMetadata's observable", () => {
    it("becomes true when there is a metadata", async () => {
      await createComponent("new");

      const field = component.form.get("metadata")!;

      expect(field.value).to.be.null;
      expect(await component.hasMetadata().pipe(first()).toPromise())
        .to.be.false;

      field.setValue(records[0].metadata);

      expect(await component.hasMetadata().pipe(first()).toPromise())
        .to.be.true;
    });

    it("becomes false when there is no metadata", async () => {
      await createComponent(records[0].id!);

      const field = component.form.get("metadata")!;

      expect(field.value).to.not.be.null;
      expect(await component.hasMetadata().pipe(first()).toPromise())
        .to.be.true;

      field.setValue(null);

      expect(await component.hasMetadata().pipe(first()).toPromise())
        .to.be.false;
    });
  });

  describe("#viewSchema", () => {
    it("is a no-op when there no schema", async () => {
      await createComponent("new");
      const field = component.form.get("schema")!;

      expect(field.value).to.be.null;
      expect(await component.viewSchema()).to.be.null;
    });

    it("opens the schema when there is a schema", async () => {
      await createComponent(records[0].id!);
      const field = component.form.get("schema")!;

      expect(field.value).to.not.be.null;
      const win = await component.viewSchema();
      expect(win).to.not.be.null;
    });
  });

  describe("#viewMetadata", () => {
    it("is a no-op when there no metadata", async () => {
      await createComponent("new");
      const field = component.form.get("metadata")!;

      expect(field.value).to.be.null;
      expect(await component.viewMetadata()).to.be.null;
    });

    it("opens the metadata when there is metadata", async () => {
      await createComponent(records[0].id!);
      const field = component.form.get("metadata")!;

      expect(field.value).to.not.be.null;
      const win = await component.viewMetadata();
      expect(win).to.not.be.null;
    });
  });

  describe("#clearSchema", () => {
    it("clears the schema", async () => {
      await createComponent(records[0].id!);
      const field = component.form.get("schema")!;

      expect(field.value).to.not.be.null;
      component.clearSchema();
      expect(field.value).to.be.null;
    });
  });

  describe("#clearMetadata", () => {
    it("clears the metadata", async () => {
      await createComponent(records[0].id!);
      const field = component.form.get("metadata")!;

      expect(field.value).to.not.be.null;
      component.clearMetadata();
      expect(field.value).to.be.null;
    });
  });

  describe("#setSchema", () => {
    let schemas: SchemaNameIdArray;
    let getChoice: sinon.SinonStub;
    let field: AbstractControl;

    beforeEach(async () => {
      schemas = await schemasService.getNameIdArray();
      await createComponent("new");
      // tslint:disable-next-line:no-any
      getChoice = sinon.stub(component, "getChoice" as any);
      field = component.form.get("schema")!;
      expect(field.value).to.be.null;
    });

    it("starts a dialog with a proper title and choices", async () => {
      getChoice.returns(Promise.resolve({ ok: false, selected: undefined }));
      await component.setSchema();
      expect(getChoice).to.have.been.calledOnce;
      expect(getChoice).to.have.been.calledWith("Schema", schemas);
    });

    it("is a no-op if the dialog is canceled", async () => {
      const result = { ok: false, selected: String(schemas[0].id) };
      getChoice.returns(Promise.resolve(result));
      await component.setSchema();
      expect(getChoice).to.have.been.calledOnce;
      expect(field.value).to.be.null;
    });

    it("sets the field if the dialog is not canceled", async () => {
      const result = { ok: true, selected: String(schemas[0].id) };
      getChoice.returns(Promise.resolve(result));
      await component.setSchema();
      expect(getChoice).to.have.been.calledOnce;
      const schema = await schemasService.getRecordById(schemas[0].id);
      expect(field.value).to.equal(schema!.chunk);
    });
  });

  describe("#setMetadata", () => {
    let metadata: MetadataNameIdArray;
    let getChoice: sinon.SinonStub;
    let field: AbstractControl;

    beforeEach(async () => {
      metadata = await metadataService.getNameIdArray();
      await createComponent("new");
      // tslint:disable-next-line:no-any
      getChoice = sinon.stub(component, "getChoice" as any);
      field = component.form.get("metadata")!;
      expect(field.value).to.be.null;
    });

    it("starts a dialog with a proper title and choices", async () => {
      getChoice.returns(Promise.resolve({ ok: false, selected: undefined }));
      await component.setMetadata();
      expect(getChoice).to.have.been.calledOnce;
      expect(getChoice).to.have.been.calledWith("Metadata", metadata);
    });

    it("is a no-op if the dialog is canceled", async () => {
      const result = { ok: false, selected: String(metadata[0].id) };
      getChoice.returns(Promise.resolve(result));
      await component.setMetadata();
      expect(getChoice).to.have.been.calledOnce;
      expect(field.value).to.be.null;
    });

    it("sets the field if the dialog is not canceled", async () => {
      const result = { ok: true, selected: String(metadata[0].id) };
      getChoice.returns(Promise.resolve(result));
      await component.setMetadata();
      expect(getChoice).to.have.been.calledOnce;
      const record = await metadataService.getRecordById(metadata[0].id);
      expect(field.value).to.equal(record!.chunk);
    });
  });

  describe("#onSubmit", () => {
    it("is a no-op if the form is not valid", async () => {
      await createComponent("new");

      const count = await packsService.getRecordCount();
      expect(await component.onSubmit(new Event("click"))).to.be.null;
      expect(await packsService.getRecordCount()).to.equal(count);
    });

    describe("with valid form", () => {
      it("creates new record and navigates to record's details", async () => {
        await createComponent("new");

        const count = await packsService.getRecordCount();

        const record = records[0];
        component.form.patchValue({
          name: `${record.name}2`,
          mode: modesService.pathToMode(record.mode),
          schema: record.schema,
        });
        fixture.detectChanges();
        await fixture.whenStable();

        const stub = sinon.stub(router, "navigate");
        stub.returns(Promise.resolve(true));
        const newRecord = await component.onSubmit(new Event("click"));
        expect(newRecord).to.not.be.null;
        expect(await packsService.getRecordCount()).to.equal(count + 1);

        // tslint:disable-next-line:no-any
        expect((stub as any).firstCall)
          .to.have.been.calledWith(["..", newRecord!.id],
                                   // tslint:disable-next-line:no-any
                                   { relativeTo: (component as any).route });
      });

      it("updates an existing record", async () => {
        const record = records[0];
        await createComponent(record.id!);

        const count = await packsService.getRecordCount();

        component.form.patchValue({
          name: `${record.name}2`,
        });
        fixture.detectChanges();
        await fixture.whenStable();

        expect(await component.onSubmit(new Event("click"))).to.not.be.null;
        expect(await packsService.getRecordCount()).to.equal(count);

        const newRecord = (await packsService.getRecordById(record.id!))!;
        expect(newRecord.name).to.equal(`${record.name}2`);
      });
    });
  });

  describe("renders HTML", () => {
    it("form shows the information of the pack being edited", async () => {
      await createComponent(records[0].id!);

      // Check the fields.
      expect(el.querySelector("[name='name']"))
        .to.have.property("value").equal("foo");
      expect(el.querySelector("[name='mode']"))
        .to.have.property("value").equal("generic");
      expect(el.querySelector("[name='matchLocalName']"))
        .to.have.property("value").equal("local");
      expect(el.querySelector("[name='matchNamespaceURI']"))
        .to.have.property("value").equal("uri");
      expect(el.querySelector("[name='uploaded']"))
        .to.have.property("value").equal(records[0].uploaded.toLocaleString());
      expect(el.querySelector("[name='downloaded']"))
        .to.have.property("value")
        .equal(records[0].downloaded.toLocaleString());

      // Check that the buttons for schema and metadata are enabled.
      expect(el.querySelector(".btn.view-schema"))
        .to.have.property("disabled").is.not.true;
      expect(el.querySelector(".btn.view-metadata"))
        .to.have.property("disabled").is.not.true;
    });

    it("form populates with a new pack when editing a new pack", async () => {
      await createComponent("new");

      // Check the fields.
      expect(el.querySelector("[name='name']"))
        .to.have.property("value").equal("");
      expect(el.querySelector("[name='mode']"))
        .to.have.property("value").equal("");
      expect(el.querySelector("[name='matchLocalName']"))
        .to.have.property("value").equal("");
      expect(el.querySelector("[name='matchNamespaceURI']"))
        .to.have.property("value").equal("");
      expect(el.querySelector("[name='uploaded']"))
      // We don't check a specific value for it.
        .to.have.property("value").not.equal("never");
      expect(el.querySelector("[name='downloaded']"))
        .to.have.property("value").equal("never");

      // Check that the buttons for schema and metadata are enabled.
      expect(el.querySelector(".btn.view-schema"))
        .to.have.property("disabled").is.true;
      expect(el.querySelector(".btn.view-metadata"))
        .to.have.property("disabled").is.true;
    });

    it("immediately validates fields", async () => {
      await createComponent("new");
      expect(el.querySelector("input.ng-invalid")).to.not.be.null;
    });

    it("submit button is disabled until the form is valid", async () => {
      await createComponent("new");

      const submit = el.querySelector("button[type='submit']");
      expect(submit).to.have.property("disabled").is.true;

      const record = records[0];
      component.form.patchValue({
        name: `${record.name}2`,
        mode: modesService.pathToMode(record.mode),
        schema: record.schema,
      });
      await awaitFormValidation(fixture);
      expect(submit).to.have.property("disabled").is.false;
    });

    function makeErrorTest(fieldName: string, alter: boolean): void {
      it(`the ${fieldName} field shows an error until filled`, async () => {
        await createComponent("new");

        const errorSelector = `div.${fieldName}-error`;
        expect(el.querySelector(errorSelector)).to.not.be.null;

        const record = records[0];
        component.form.patchValue({
          // tslint:disable-next-line:no-any
          [fieldName]: !alter ? (record as any)[fieldName] :
          // tslint:disable-next-line:no-any
            `${(record as any)[fieldName]}2`,
        });
        await awaitFormValidation(fixture);

        expect(el.querySelector(errorSelector)).to.be.null;
      });
    }

    // tslint:disable-next-line:mocha-no-side-effect-code
    makeErrorTest("name", true);
    // tslint:disable-next-line:mocha-no-side-effect-code
    makeErrorTest("mode", false);
    // tslint:disable-next-line:mocha-no-side-effect-code
    makeErrorTest("schema", false);

    it("the name field shows an error if duplicate", async () => {
      await createComponent("new");

      component.form.patchValue({
        name: "not a duplicate",
      });
      await awaitFormValidation(fixture);

      const errorSelector = `div.name-error`;
      expect(el.querySelector(errorSelector)).to.be.null;

      const record = records[0];
      component.form.patchValue({
        name: record.name,
      });
      await awaitFormValidation(fixture);

      expect(el.querySelector(errorSelector)).to.have
        .property("textContent")
        .satisfies(
          (text: string) => text.trim() === "This name already exists.");
    });
  });
});
