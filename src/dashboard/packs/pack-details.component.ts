import { Location } from "@angular/common";
import { Component, ComponentFactory, ComponentFactoryResolver, OnInit,
         ViewChild, ViewContainerRef } from "@angular/core";
import { AbstractControl, FormBuilder, FormGroup,
         Validators } from "@angular/forms";
import { ActivatedRoute, ParamMap, Router } from "@angular/router";
import { BehaviorSubject } from "rxjs/BehaviorSubject";
import { Observable } from "rxjs/Observable";
import { first } from "rxjs/operators/first";
import { switchMap } from "rxjs/operators/switchMap";
import { Subscription } from "rxjs/Subscription";

import { ChunksService } from "../chunks.service";
import { Choice, DialogChoiceComponent,
         Result } from "../dialog-choice.component";
import { MetadataService } from "../metadata.service";
import { ModesService } from "../modes.service";
import { Pack } from "../pack";
import { PacksService } from "../packs.service";
import { SchemasService } from "../schemas.service";
import { updateFormErrors } from "../util";

export interface DuplicateNameError {
  duplicateName: {
    value: string;
  };
}

@Component({
  selector: "pack-details-component",
  templateUrl: "./pack-details.component.html",
})
export class PackDetailsComponent implements OnInit {
  @ViewChild("container", { read: ViewContainerRef })
  container!: ViewContainerRef;
  form!: FormGroup;
  readonly formErrors: {[name: string]: string } = {};
  readonly validationMessages: {[name: string]: {[name: string]: string}} = {
    name: {
      required: "Name is required.",
      duplicateName: "This name already exists.",
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

  private readonly dialogFactory: ComponentFactory<DialogChoiceComponent>;
  private _hasSchema: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private _hasMetadata: BehaviorSubject<boolean> = new BehaviorSubject(false);
  private destroyed: boolean = false;
  private readonly subscriptions: Subscription = new Subscription();

  constructor(private readonly fb: FormBuilder,
              private readonly files: PacksService,
              private readonly chunksService: ChunksService,
              private readonly modesService: ModesService,
              private readonly schemasService: SchemasService,
              private readonly metadataService: MetadataService,
              private readonly resolver: ComponentFactoryResolver,
              private readonly router: Router,
              private readonly route: ActivatedRoute,
              private readonly location: Location) {
    this.dialogFactory =
      this.resolver.resolveComponentFactory(DialogChoiceComponent);
  }

  ngOnInit(): void {
    const subscriptions = this.subscriptions;

    this.modes = this.modesService.modes;
    const routeSub = this.route.paramMap
      .pipe(switchMap(async (params: ParamMap) => {
        if (this.destroyed) {
          return new Pack("");
        }

        const idParam = params.get("id");
        if (idParam === null) {
          throw new Error("no id");
        }
        if (idParam !== "new") {
          return this.files.getRecordById(+idParam);
        }

        return new Pack("");
      }))
      .subscribe((record) => {
        if (this.destroyed) {
          return;
        }

        if (record === undefined) {
          throw new Error(
            "navigating to the details of a non-existing record");
        }

        this.file = record;

        this.form.reset({
          name: record.name,
          mode: this.modesService.pathToMode(record.mode),
          schema: record.schema,
          metadata: record.metadata,
          match: record.match,
          uploaded: record.uploaded.toLocaleString(),
          downloaded: record.downloaded.toLocaleString(),
        });

        for (const key of Object.keys(this.form.controls)) {
          const control = this.form.controls[key];
          if (control.validator !== null) {
            this.form.controls[key].markAsDirty();
          }
        }

        this.form.updateValueAndValidity();
      });
    subscriptions.add(routeSub);

    const form = this.form = this.fb.group({
      name: [null, Validators.required,
             this.validateDuplicateName.bind(this)],
      mode: [null, Validators.required ],
      schema: [null, Validators.required ],
      metadata: null,
      match: this.fb.group({
        method: "top-element",
        localName: null,
        namespaceURI: null,
      }),
      uploaded: [{
        value: null,
        disabled: true,
      }],
      downloaded: [{
        value: null,
        disabled: true,
      }],
    });

    subscriptions.add(form.statusChanges.subscribe(() => {
      // tslint:disable-next-line:no-floating-promises
      updateFormErrors(this.form, this.formErrors, this.validationMessages);
    }));

    // tslint:disable-next-line:no-non-null-assertion
    subscriptions.add(form.get("schema")!.valueChanges.subscribe((value) => {
      this._hasSchema.next(value != null);
    }));

    // tslint:disable-next-line:no-non-null-assertion
    subscriptions.add(form.get("metadata")!.valueChanges.subscribe((value) => {
      this._hasMetadata.next(value != null);
    }));
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.subscriptions.unsubscribe();
    this._hasSchema.complete();
    this._hasMetadata.complete();
  }

  async validateDuplicateName(control: AbstractControl):
  Promise<DuplicateNameError | null> {
    const record = this.file;
    if (this.destroyed || record === undefined) {
      return null;
    }

    const name = control.value;
    const other = (await this.files.getRecordByName(name));
    const duplicate = (other != null && other.id !== record.id);
    return duplicate ? {
      duplicateName: {
        value: control.value,
      },
    } : null;
  }

  async onSubmit(event: Event): Promise<Pack | null> {
    event.stopPropagation();
    event.preventDefault();

    const form = this.form;
    // The form has not finished validating. Wait for it to be complete.
    if (this.form.pending) {
      await this.form.statusChanges.pipe(first()).toPromise();
    }

    if (this.form.invalid) {
      return null;
    }

    const file = new Pack(
      // tslint:disable-next-line:no-non-null-assertion
      this.form.get("name")!.value, {
        // tslint:disable-next-line:no-non-null-assertion
        schema: form.get("schema")!.value,
        // tslint:disable-next-line:no-non-null-assertion
        metadata: form.get("metadata")!.value,
        // We need to record the full path in the pack.
        // tslint:disable-next-line:no-non-null-assertion
        mode: this.modesService.modeToPath(form.get("mode")!.value),
        // tslint:disable-next-line:no-non-null-assertion
        match: form.get("match")!.value,
      });

    // When we don't already have an id, we don't want to set the key to the
    // value "undefined", but keep it unset.
    if (this.file.id !== undefined) {
      file.id = this.file.id;
    }

    await this.files.updateRecord(file);
    await this.router.navigate(["..", file.id], { relativeTo: this.route });
    return file;
  }

  goBack(): void {
    this.location.back();
  }

  hasSchema(): Observable<boolean> {
    return this._hasSchema.asObservable();
  }

  hasMetadata(): Observable<boolean> {
    return this._hasMetadata.asObservable();
  }

  private async getChoice(title: string, choices: Choice[]): Promise<Result> {
    const component = this.container.createComponent(this.dialogFactory);
    component.instance.title = title;
    component.instance.choices = choices;
    component.instance.selected = undefined;
    const result = await component.instance.done;
    component.destroy();
    return result;
  }

  async setSchema(): Promise<void> {
    const schemas = await this.schemasService.getNameIdArray();
    const result = await this.getChoice("Schema", schemas);
    if (result.ok) {
      this.form.patchValue({
        schema:
        // tslint:disable-next-line:no-non-null-assertion
        (await this.schemasService.getRecordById(+result.selected))!.chunk,
      });
    }
  }

  async setMetadata(): Promise<void> {
    const metadata = await this.metadataService.getNameIdArray();
    const result = await this.getChoice("Metadata", metadata);
    if (result.ok) {
      this.form.patchValue({
        metadata:
        // tslint:disable-next-line:no-non-null-assertion
        (await this.metadataService.getRecordById(+result.selected))!.chunk,
      });
    }
  }

  clearSchema(): void {
    this.form.patchValue({
      schema: null,
    });
  }

  clearMetadata(): void {
    this.form.patchValue({
      metadata: null,
    });
  }

  async viewSchema(): Promise<Window | null> {
    return this.viewField("schema");
  }

  async viewMetadata(): Promise<Window | null> {
    return this.viewField("metadata");
  }

  async viewField(name: string): Promise<Window | null> {
    // tslint:disable-next-line:no-non-null-assertion
    const id = this.form.get(name)!.value;
    if (id == null || id === "") {
      return null;
    }

    const record = await this.chunksService.getRecordById(id);

    if (record === undefined) {
      return null;
    }

    return this.openTabWithData(await record.getData());
  }

  openTabWithData(data: string): Window | null {
    const win = window.open("", "_blank");
    if (win !== null) {
      win.document.body.textContent = data;
    }
    return win;
  }
}
