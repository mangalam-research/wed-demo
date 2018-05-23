import "chai";
import "mocha";
import * as sinon from "sinon";

import { DebugElement } from "@angular/core";
import { ComponentFixture, ComponentFixtureAutoDetect,
         TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";
import { RouterTestingModule } from "@angular/router/testing";

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { ClearStoreComponent } from "dashboard/clear-store.component";
import { ConfirmService } from "dashboard/confirm.service";
import { MetadataService } from "dashboard/metadata.service";
import { MetadataComponent } from "dashboard/metadata/metadata.component";
import { ProcessingService } from "dashboard/processing.service";
import { UploadComponent } from "dashboard/upload.component";

import { ComponentTestState, eventTests,
         renderTests } from "./common-component.tests";
import { waitFor } from "./util";

describe("MetadataComponent", () => {
  let component: MetadataComponent;
  let fixture: ComponentFixture<MetadataComponent>;
  let de: DebugElement;
  let el: HTMLElement;
  let sandbox: sinon.SinonSandbox;
  let recordsService: MetadataService;
  let fakeConfirmer: sinon.SinonStub;

  // State must exist at the time of test discovery.
  // tslint:disable-next-line:mocha-no-side-effect-code
  const state: ComponentTestState = Object.create(null);

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    fakeConfirmer = sandbox.stub();
    fakeConfirmer.returns(Promise.resolve(true));
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
      ],
      declarations: [ ClearStoreComponent, UploadComponent, MetadataComponent ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
        ChunksService,
        ConfirmService,
        ProcessingService,
        MetadataService,
        { provide: "Confirmer", useValue: fakeConfirmer },
      ],
    });

    return TestBed.compileComponents()
      .then(() => {
        recordsService = TestBed.get(MetadataService);

        return Promise.all(
          [{ name: "a", data: "foo" },
           { name: "b", data: "bar" }]
            .map((x) => recordsService.makeRecord(x.name, x.data)
                 .then((record) => recordsService.updateRecord(record))));
      })
      .then(() => {
        fixture = TestBed.createComponent(MetadataComponent);
        component = fixture.componentInstance;
        de = fixture.debugElement.query(By.css("div"));
        el = de.nativeElement;
        state.component = component;
        state.fixture = fixture;
        state.el = el;
        state.recordsService = recordsService;
        state.sandbox = sandbox;
      })
    // Wait until the component has refreshed.
      .then(() => waitFor(() => component.records != null &&
                          component.records.length !== 0));
  });

  afterEach(() => db.delete().then(() => db.open()));

  // tslint:disable-next-line:mocha-no-side-effect-code
  renderTests.make(state);
  // tslint:disable-next-line:mocha-no-side-effect-code
  eventTests.make(state);

});
