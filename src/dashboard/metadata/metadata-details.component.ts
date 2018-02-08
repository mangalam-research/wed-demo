import { Location } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Params } from "@angular/router";
import { switchMap } from "rxjs/operators/switchMap";

import { Metadata } from "../metadata";
import { MetadataService } from "../metadata.service";

@Component({
  selector: "metadata-details-component",
  templateUrl: "./metadata-details.component.html",
})
export class MetadataDetailsComponent implements OnInit {
  file!: Metadata;

  constructor(private files: MetadataService,
              private route: ActivatedRoute,
              private location: Location) {}

  ngOnInit(): void {
    this.route.params
      .pipe(switchMap((params: Params) =>
                      this.files.getRecordById(+params["id"])))
      .subscribe((record) => {
        if (record === undefined) {
          throw new Error("record does not exist");
        }

        this.file = record;
      });
  }

  goBack(): void {
    this.location.back();
  }
}
