import { Location } from "@angular/common";
import { Component, OnInit } from "@angular/core";
import { ActivatedRoute, Params } from "@angular/router";
import { switchMap } from "rxjs/operators";

import { Schema } from "../schema";
import { SchemasService } from "../schemas.service";

@Component({
  selector: "schema-details-component",
  templateUrl: "./schema-details.component.html",
})
export class SchemaDetailsComponent implements OnInit {
  file!: Schema;

  constructor(private files: SchemasService,
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
