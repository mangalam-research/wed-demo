import "chai";
import "mocha";
import * as sinon from "sinon";

const expect = chai.expect;

import { DebugElement } from "@angular/core";
import { ComponentFixture, TestBed } from "@angular/core/testing";
import { By } from "@angular/platform-browser";

import { ClearStoreComponent } from "dashboard/clear-store.component";
import { ConfirmService } from "dashboard/confirm.service";
import { Clearable } from "dashboard/db.service";

class FakeClearable implements Clearable {
  clear(): Promise<void> {
    return Promise.resolve();
  }
}

describe("ClearStoreComponent", () => {
  let component: ClearStoreComponent;
  let fixture: ComponentFixture<ClearStoreComponent>;
  let de: DebugElement;
  let el: HTMLElement;
  let fakeConfirmer: sinon.SinonStub;

  beforeEach(() => {
    fakeConfirmer = sinon.stub();
    TestBed.configureTestingModule({
      declarations: [ ClearStoreComponent ],
      providers: [
        ConfirmService,
        { provide: "Confirmer", useValue: fakeConfirmer },
        { provide: "Clearable", useClass: FakeClearable },
      ],
    });

    return TestBed.compileComponents().then(() => {
      fixture = TestBed.createComponent(ClearStoreComponent);
      component = fixture.componentInstance;
      de = fixture.debugElement.query(By.css("button"));
      el = de.nativeElement;
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it("does not clear if the user answers negatively", () => {
    const spy = sinon.spy(FakeClearable.prototype, "clear");
    fakeConfirmer.returns(Promise.resolve(false));
    return component.clear().then(() => {
      expect(fakeConfirmer).to.have.been.calledOnce;
      expect(spy).to.have.not.been.called;
    });
  });

  it("clears if the user answers positively", () => {
    const spy = sinon.spy(FakeClearable.prototype, "clear");
    fakeConfirmer.returns(Promise.resolve(true));
    return component.clear().then(() => {
      expect(fakeConfirmer).to.have.been.calledOnce;
      expect(spy).to.have.been.calledOnce;
    });
  });

  it("clicking the button prompts for confirmation", () => {
    fakeConfirmer.returns(Promise.resolve(false));
    el.click();
    expect(fakeConfirmer).to.have.been.calledOnce;
  });
});
