/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import { Component } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";

import { ConfirmService } from "../confirm.service";
import { GenericRecordsComponent } from "../generic-records.component";
import { Metadata } from "../metadata";
import { MetadataService } from "../metadata.service";
import { ProcessingService } from "../processing.service";

@Component({
  selector: "metadata-component",
  templateUrl: "./metadata.component.html",
  styleUrls: ["../generic-records.component.css"],
  providers: [
    { provide: "Loader", useExisting: MetadataService },
    { provide: "Clearable", useExisting: MetadataService },
  ],
})
export class MetadataComponent extends
GenericRecordsComponent<Metadata, MetadataService> {
  // We must have the constructor here so that it can be annotated by the
  // decorator and Angular can find its bearings.
  constructor(route: ActivatedRoute, router: Router,
              files: MetadataService,
              processing: ProcessingService,
              confirmService: ConfirmService) {
    super(route, router, files, processing, confirmService, "application/json");
  }
}
