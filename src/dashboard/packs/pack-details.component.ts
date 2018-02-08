import { Location } from "@angular/common";
import { Component, OnInit, ViewChild } from "@angular/core";
import { NgForm } from "@angular/forms";
import { ActivatedRoute, Params } from "@angular/router";
import { switchMap } from "rxjs/operators/switchMap";
import { Subscription } from "rxjs/Subscription";

import { MetadataService,
         NameIdArray as MetadataInfoArray } from "../metadata.service";
import { ModesService } from "../modes.service";
import { Pack } from "../pack";
import { PacksService } from "../packs.service";
import { NameIdArray as SchemaInfoArray,
         SchemasService } from "../schemas.service";
import { updateFormErrors } from "../util";

@Component({
  selector: "pack-details-component",
  templateUrl: "./pack-details.component.html",
})
export class PackDetailsComponent implements OnInit {
  form?: NgForm;
  @ViewChild("form")
  currentForm?: NgForm;
  formSub: Subscription | undefined;
  readonly formErrors: {[name: string]: string } = {
    name: "",
  };
  readonly validationMessages: {[name: string]: {[name: string]: string}}= {
    name: {
      required: "Name is required.",
    },
    mode: {
      required: "Mode is required.",
    },
    schema: {
      required: "Schema is required.",
    },
  };

  file!: Pack;
  modes!: string[];
  schemas!: SchemaInfoArray;
  metadata!: MetadataInfoArray;

  constructor(private readonly files: PacksService,
              private readonly modesService: ModesService,
              private readonly schemasService: SchemasService,
              private readonly metadataService: MetadataService,
              private readonly route: ActivatedRoute,
              private readonly location: Location) {}

  ngOnInit(): void {
    this.modes = this.modesService.modes;
    // tslint:disable-next-line:no-floating-promises
    Promise.all(
      [this.schemasService.getNameIdArray().then(
        (schemas) => this.schemas = schemas),
       this.metadataService.getNameIdArray().then(
         (metadata) => this.metadata = metadata)])
      .then(() => {
        this.route.params
          .pipe(switchMap((params: Params) => {
            const idParam = params["id"];
            if (idParam !== "new") {
              const id = +idParam;
              return this.files.getRecordById(id);
            }
            return Promise.resolve(new Pack(""));
          }))
          .subscribe((record) => {
            if (record === undefined) {
              throw new Error(
                "navigating to the details of a non-existing record");
            }
            this.file = record;
            // We need to convert the full path back to a mode name for display.
            this.file.mode = this.modesService.pathToMode(this.file.mode);
          });
      });
  }

  ngAfterViewChecked(): void {
    this.formChanged();
  }

  formChanged(): void {
    if (this.currentForm === this.form) {
      return;
    }

    if (this.formSub !== undefined) {
      this.formSub.unsubscribe();
    }

    this.form = this.currentForm;
    if (this.form !== undefined) {
      // tslint:disable-next-line:no-non-null-assertion
      this.formSub = this.form.valueChanges!
        .subscribe(() => {
          this.onValueChanged();
        });
    }
  }

  onValueChanged(): void {
    if (this.form === undefined) {
      return;
    }

    updateFormErrors(this.form, this.formErrors, this.validationMessages);
  }

  onSubmit(event: Event): Promise<Pack> {
    event.stopPropagation();
    event.preventDefault();

    const file = this.file.clone();
    return Promise.resolve()
      .then(() => {
        return Promise.all([
          this.schemasService.getRecordById(+file.schema),
          file.metadata != null ?
            this.metadataService.getRecordById(+file.metadata) : undefined,
        ]);
      })
      .then(([schema, metadata]) => {
        if (schema === undefined) {
          throw new Error("schema is mandatory");
        }
        file.schema = schema.chunk;
        if (metadata !== undefined) {
          file.metadata = metadata.chunk;
        }

        // We need to record the full path in the pack.
        file.mode = this.modesService.modeToPath(file.mode);

        return this.files.updateRecord(file);
      });
  }

  goBack(): void {
    this.location.back();
  }
}
