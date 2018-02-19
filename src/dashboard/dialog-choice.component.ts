import { Component, ElementRef, Input, ViewChild } from "@angular/core";
import "bootstrap";
import * as $ from "jquery";

export interface Choice {
  id: number | string;
  name: string;
}

export interface Result {
  ok: boolean;
  selected: string;
}

@Component({
  selector: "dialog-choice-component",
  templateUrl: "./dialog-choice.component.html",
})
export class DialogChoiceComponent<T extends Choice = Choice> {
  @Input()
  title!: string;

  @Input()
  choices!: T[];

  @Input()
  selected: string | undefined;

  @ViewChild("modal")
  private modalRef!: ElementRef;

  private doneResolve!: (x: Result) => void;

  readonly done: Promise<Result>;

  constructor() {
    // tslint:disable-next-line:promise-must-complete
    this.done = new Promise((resolve) => {
      this.doneResolve = resolve;
    });
  }

  ngOnInit(): void {
    const element = this.modalRef.nativeElement;
    const $modal = $(element);

    $modal.modal();
  }

  onButtonClicked(name: "ok" | "cancel"): void {
    this.doneResolve({
      ok: name === "ok",
      // tslint:disable-next-line:no-non-null-assertion
      selected: this.selected!,
    });
  }
}
