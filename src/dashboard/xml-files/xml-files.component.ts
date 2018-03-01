/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import { Component, Inject, Optional } from "@angular/core";
import { ActivatedRoute, Router } from "@angular/router";
import { Observable } from "rxjs/Observable";
import { defer } from "rxjs/observable/defer";
import { from } from "rxjs/observable/from";
import { concatMap } from "rxjs/operators/concatMap";
import { first } from "rxjs/operators/first";
import { map } from "rxjs/operators/map";
import { startWith } from "rxjs/operators/startWith";

import { ConfirmService } from "../confirm.service";
import { GenericRecordsComponent } from "../generic-records.component";
import { Pack } from "../pack";
import { PacksService } from "../packs.service";
import { ProcessingService } from "../processing.service";
import { XMLFile } from "../xml-file";
import { XMLFilesService } from "../xml-files.service";
import { XMLTransformService } from "../xml-transform.service";

/**
 * This class records data that we need to build the rows of the files
 * table. Some of the information needed is asynchronous. We must cache the
 * observables that are used by the GUI because the way Angular works, if a new
 * observable is returned, then this amounts to a change in the data modeled.
 */
export class EditingData {

  private _top?: Element | null;

  /**
   * Get the top element of the document. We cache this information because an
   * [[EditingData]] object is recreated whenever the XML Files database changes
   * in any way.
   */
  private async getTop(): Promise<Element | null> {
    if (this._top === undefined) {
      const data = await this.record.getData();
      const doc = this.parser.parseFromString(data, "text/xml");
      this._top = doc.firstElementChild;
    }

    return this._top;
  }

  /** The pack automatically associated with the file. */
  readonly automaticPack: Observable<Pack | undefined>  =
    defer(() => this.getTop()).pipe(concatMap((top) => {
      if (top === null) {
        return from([undefined]);
      }

      const localName = top.tagName;
      let namespaceURI = top.namespaceURI;
      if (namespaceURI === null) {
        namespaceURI = "";
      }

      return this.packsService.getMatchObservable(localName, namespaceURI);
    }));

  /** The pack manually or automatically associated with the file. */
  readonly associatedPack: Observable<Pack | undefined> =
    defer(async () => {
      if (this.record.pack === undefined) {
        return undefined;
      }

      const pack = await this.packsService.getRecordById(this.record.pack);
      if (pack === undefined) {
        throw new Error(`cannot load pack: ${this.record.pack}`);
      }

      return pack;
    }).pipe(concatMap((pack) => (pack !== undefined ? from([pack]) :
                                 this.automaticPack)));

  /**
   * Whether the file is editable or not. It is editable if it has a pack
   * manually or automatically associated with it.
   */
  readonly editable: Observable<boolean> =
    this.associatedPack.pipe(map((pack) => pack !== undefined));

  /**
   * A value appropriate for ``x`` in ``setAttribute("disabled", x)``. We use
   * this to disable the editing button.
   */
  readonly editingDisabled: Observable<null | string> =
    this.editable.pipe(map((editable) => editable ? null : ""),
                       // Cast necessary to please TS...
                       startWith("" as string | null));

  /**
   * The title to give to the edit button.
   */
  readonly editButtonTitle: Observable<string> =
    this.associatedPack.pipe(map((pack) => pack !== undefined ?
                                 `Edit with pack ${pack.name}` :
                                 "This file needs a pack before editing."));

  /**
   * @param record The file for which we are caching editing data.
   *
   * @param packsService The packs service to use to get pack information.
   *
   * @param parser The DOM parser to use to parse XML data.
   */
  constructor(private readonly record: XMLFile,
              private readonly packsService: PacksService,
              private readonly parser: DOMParser) {}
}

@Component({
  selector: "xml-files-component",
  templateUrl: "./xml-files.component.html",
  styleUrls: ["../generic-records.component.css"],
  providers: [
    { provide: "Loader", useExisting: XMLFilesService },
    { provide: "Clearable", useExisting: XMLFilesService },
  ],
})
export class XMLFilesComponent
extends GenericRecordsComponent<XMLFile, XMLFilesService> {
  private readonly parser: DOMParser = new DOMParser();
  private cachedEditingData: Record<string, EditingData> =
    Object.create(null);

  constructor(route: ActivatedRoute,
              router: Router,
              files: XMLFilesService,
              processing: ProcessingService,
              confirmService: ConfirmService,
              @Optional() @Inject(XMLTransformService)
              readonly xmlTransforms: XMLTransformService[] | null,
              private readonly packsService: PacksService) {
    super(route, router, files, processing, confirmService, "text/xml");
  }

  protected refresh(): void {
    this.cachedEditingData = Object.create(null);
    super.refresh();
  }

  /**
   * Downloads an XML file. This updates the record with a new download date.
   *
   * @param record The file to download.
   *
   * @returns A promise that resolves once the download has been launched and
   * the record updated with the new download date.
   */
  async download(record: XMLFile): Promise<void> {
    await super.download(record);
    // We update the last time it was downloaded. We do not detect whether the
    // download was cancelled. Not sure we *could*, even...
    record.downloaded = new Date();
    await this.files.updateRecord(record);
  }

  /**
   * Edit an XML file.
   *
   * @params The file to edit.
   *
   * @returns A promise that resolves once launching the editing task is done.
   */
  async edit(record: XMLFile): Promise<void> {
    const base = "../kitchen-sink.html?nodemo=1&localstorage=";
    const pack = await this.getEditingData(record).associatedPack.pipe(first())
      .toPromise();

    if (pack === undefined) {
      throw new Error(`edit launched on file without a pack associated \
with it manually or automatically`);
    }

    const here = window.location.href;
    const fileUrl = this.files.makeIndexedDBURL(record);
    const packUrl = this.packsService.makeIndexedDBURL(pack);
    const url = `${base}${fileUrl}&pack=${packUrl}&management=${here}`;
    this.goTo(url);
  }

  private goTo(url: string): void {
    window.location.href = url;
  }

  /**
   * @param record The file for which to get editing data.
   *
   * @returns The editing data.
   */
  getEditingData(record: XMLFile): EditingData {
    const key = String(record.id);
    if (!(key in this.cachedEditingData)) {
      this.cachedEditingData[key] = new EditingData(record,
                                                    this.packsService,
                                                    this.parser);
    }

    return this.cachedEditingData[key];
  }

  editButtonDisabledValue(record: XMLFile): Observable<string | null> {
    return this.getEditingData(record).editingDisabled;
  }

  editButtonTitle(record: XMLFile): Observable<string> {
    return this.getEditingData(record).editButtonTitle;
  }

  /**
   * Create a new XML file. This will prompt the user in the GUI for a new
   * name. It will also prevent overwriting old files.
   *
   * @returns A promise that resolves once the operation is done (either because
   * the new file was created or because the operation was cancelled).
   */
  async newFile(): Promise<void> {
    const name =
      await this.confirmService.prompt("Give a name to your new file");

    if (name === "") {
      return;
    }

    const { write, record } =
      await this.files.writeCheck(name, this.confirmService.confirm);
    if (!write) {
      return;
    }

    const newRecord = await this.files.makeRecord(name, "");
    if (record !== null) {
      newRecord.id = record.id;
    }

    await this.files.updateRecord(newRecord);
  }
}
