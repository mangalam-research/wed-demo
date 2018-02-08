import { Component, ElementRef, ViewChild } from "@angular/core";
import "bootstrap";
import * as $ from "jquery";

import { ProcessingService } from "./processing.service";

@Component({
  selector: "processing-component",
  templateUrl: "./processing.component.html",
})
export class ProcessingComponent {
  @ViewChild("modal")
  private modalRef!: ElementRef;

  constructor(private service: ProcessingService) {}

  ngOnInit(): void {
    const element = this.modalRef.nativeElement;
    const $modal = $(element);
    const progress = element.getElementsByClassName("bar")[0] as HTMLElement;
    this.service.state.subscribe(({ total, count }) => {
      if (total === 0) {
        $modal.modal("hide");
      }
      else {
        const percent = count / total * 100;
        progress.style.width = `${percent}%`;
        $modal.modal("show");
      }
    });
  }
}
