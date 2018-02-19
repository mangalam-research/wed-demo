import "chai";
import "mocha";

const expect = chai.expect;

import { DebugElement } from "@angular/core";
import { ComponentFixture, ComponentFixtureAutoDetect,
         TestBed } from "@angular/core/testing";
import { FormsModule } from "@angular/forms";
import { By } from "@angular/platform-browser";
import { RouterTestingModule } from "@angular/router/testing";

import { DialogChoiceComponent } from "dashboard/dialog-choice.component";

describe("DialogChoiceComponent", () => {
  let component: DialogChoiceComponent;
  let fixture: ComponentFixture<DialogChoiceComponent>;
  let de: DebugElement;
  let el: HTMLElement;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        RouterTestingModule.withRoutes([]),
        FormsModule,
      ],
      declarations: [ DialogChoiceComponent ],
      providers: [
        { provide: ComponentFixtureAutoDetect, useValue: true },
      ],
    });

    return TestBed.compileComponents();
  });

  afterEach(async () => {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.destroy();
  });

  function setupFixture(): void {
    fixture = TestBed.createComponent(DialogChoiceComponent);
    component = fixture.componentInstance;
    de = fixture.debugElement.query(By.css("div"));
    el = de.nativeElement;
  }

  describe("#onButtonClicked", () => {
    beforeEach(() => {
      setupFixture();
      component.title = "Foo";
      component.choices = [];
      return fixture.whenStable();
    });

    it("called with ok causes done to have ok true", async () => {
      component.onButtonClicked("ok");
      const result = await component.done;
      expect(result).to.deep.equal({
        ok: true,
        selected: undefined,
      });
    });

    it("called with cancel causes done to have ok false", async () => {
      component.onButtonClicked("cancel");
      const result = await component.done;
      expect(result).to.deep.equal({
        ok: false,
        selected: undefined,
      });
    });
  });

  describe("renders HTML", () => {
    beforeEach(() => {
      setupFixture();
      component.title = "Foo";
      component.choices = [{
        name: "aaa",
        id: 111,
      }, {
        name: "bbb",
        id: 222,
      }];

      return fixture.whenStable();
    });

    it("shows a modal", () => {
      expect(el.matches(".modal.in")).to.be.true;
    });

    it("shows a title", () => {
      expect(el.querySelector(".modal-header h1"))
        .to.have.property("textContent").equal("Select one Foo");
      expect(el.querySelector(".modal-body form label[for='schema']"))
        .to.have.property("textContent").equal("Foo: ");
    });

    it("shows choices", () => {
      const options = el.querySelectorAll(".modal-body option");
      expect(options[0]).to.have.property("textContent").equal("aaa");
      expect(options[1]).to.have.property("textContent").equal("bbb");
      expect(options).to.be.lengthOf(2);
    });

    it("disables the Ok button until a choice is made", async () => {
      const ok = el.querySelector(".modal-footer .btn.btn-primary");
      expect(ok).to.have.property("disabled").true;
      const select =
        el.querySelector(".modal-body select") as HTMLSelectElement;
      select.value = "bbb";
      select.dispatchEvent(new Event("change"));
      await fixture.whenStable();
      expect(ok).to.have.property("disabled").false;
    });

    it("submitting a choice resolves the promise with ok true", async () => {
      const ok =
        el.querySelector(".modal-footer .btn.btn-primary") as HTMLElement;
      expect(ok).to.have.property("disabled").true;
      const select =
        el.querySelector(".modal-body select") as HTMLSelectElement;
      select.value = "222";
      select.dispatchEvent(new Event("change"));
      await fixture.whenStable();
      expect(ok).to.have.property("disabled").false;
      ok.click();
      const result = await component.done;
      expect(result).to.deep.equal({
        ok: true,
        selected: "222",
      });
    });

    it("submitting a choice closes the modal", async () => {
      const ok =
        el.querySelector(".modal-footer .btn.btn-primary") as HTMLElement;
      expect(ok).to.have.property("disabled").true;
      const select =
        el.querySelector(".modal-body select") as HTMLSelectElement;
      select.value = "222";
      select.dispatchEvent(new Event("change"));
      await fixture.whenStable();
      expect(ok).to.have.property("disabled").false;
      ok.click();
      expect(el.matches(".modal.in")).to.be.false;
    });

    it("canceling resolves the done promise with ok false", async () => {
      const cancel =
        el.querySelector(".modal-footer .btn:not(.btn-primary)") as HTMLElement;
      cancel.click();
      const result = await component.done;
      expect(result).to.deep.equal({
        ok: false,
        selected: undefined,
      });
    });

    it("canceling closes the modal", async () => {
      const cancel =
        el.querySelector(".modal-footer .btn:not(.btn-primary)") as HTMLElement;
      cancel.click();
      expect(el.matches(".modal.in")).to.be.false;
    });
  });
});
