/**
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */
"use strict";

import { Component, Inject, Optional } from "@angular/core";
import { Router } from "@angular/router";
import { Subscription } from "rxjs";

import { ConfirmService } from "./confirm.service";
import { GenericRecordsComponent } from "./generic-records.component";
import { Pack } from "./pack";
import { PacksService } from "./packs.service";
import { ProcessingService } from "./processing.service";
import { XML_FILES } from "./route-paths";
import { XMLFile } from "./xml-file";
import { XMLFilesService } from "./xml-files.service";
import { XMLTransformService } from "./xml-transform.service";

/**
 * This class records data that we need to build the rows of the files
 * table. Some of the information needed is asynchronous and thus must be
 * obtained through promises. We must cache the promises that are used by the
 * GUI because the way Angular works, if a new promise is returned, then this
 * amounts to a change in the data modeled.
 */
export class CachedEditingData {
  private _editingDisabled?: Promise<null | string>;
  private _editable?: Promise<boolean>;
  private _editButtonTitle?: Promise<string>;

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

  /**
   * @returns A promise resolving to whether the file is editable or not. It is
   * editable if it has a pack manually or automatically associated with it.
   */
  editable(): Promise<boolean> {
    if (this._editable === undefined) {
      this._editable = Promise.resolve()
        .then(() => this.getPack())
        .then((pack) => pack !== undefined);
    }

    return this._editable;
  }

  /**
   * @returns A promise resolving to a value appropriate for ``x`` in
   * ``setAttribute("disabled", x)``. We use this to disable the editing button.
   */
  editingDisabled(): Promise<null | string> {
    if (this._editingDisabled === undefined) {
      this._editingDisabled = this.editable()
        .then((editable) => editable ? null : "");
    }

    return this._editingDisabled;
  }

  /**
   * @returns A promise resolving to the title to give to the edit button.
   */
  editButtonTitle(): Promise<string> {
    if (this._editButtonTitle === undefined) {
      this._editButtonTitle = this.editable()
        .then((editable) => editable ? "Edit" :
              "This file needs a pack before editing.");
    }

    return this._editButtonTitle;
  }
  /**
   * @returns A promise resolving to a pack manually or automatically associated
   * with the file. **THE RETURN VALUE IS NOT CACHED**.
   */
  getPack(): Promise<Pack | undefined> {
    return Promise.resolve()
      .then(() => {
        if (this.record.pack !== undefined) {
          return this.packsService.getRecordById(this.record.pack)
            .then((pack) => {
              if (pack === undefined) {
                throw new Error(`cannot load pack: ${this.record.pack}`);
              }

              return pack;
            });
        }

        return this.findPack();
      });
  }

  /**
   * @returns A promise resolving to a pack automatically associated with the
   * file. **THE RETURN VALUE IS NOT CACHED**.
   */
  findPack(): Promise<Pack | undefined> {
    return this.record.getData()
      .then((data) => {
        const doc = this.parser.parseFromString(data, "text/xml");
        const top = doc.firstElementChild;
        if (top === null) {
          return undefined;
        }

        const localName = top.tagName;
        let namespaceURI = top.namespaceURI;
        if (namespaceURI === null) {
          namespaceURI = "";
        }

        return this.packsService.matchWithPack(localName, namespaceURI);
      });
  }

}

@Component({
  selector: "xml-files-component",
  templateUrl: "./xml-files.component.html",
  styleUrls: ["./generic-records.component.css"],
  providers: [
    { provide: "Loader", useExisting: XMLFilesService },
    { provide: "Clearable", useExisting: XMLFilesService },
  ],
})
export class XMLFilesComponent
extends GenericRecordsComponent<XMLFile, XMLFilesService> {
  private readonly parser: DOMParser = new DOMParser();
  private cachedEditingData: Record<string, CachedEditingData> =
    Object.create(null);
  private packsChangeSub: Subscription;

  constructor(router: Router,
              files: XMLFilesService,
              processing: ProcessingService,
              confirmService: ConfirmService,
              @Optional() @Inject(XMLTransformService)
              readonly xmlTransforms: XMLTransformService[] | null,
              private readonly packsService: PacksService) {
    super(router, files, processing, confirmService, XML_FILES);
  }

  ngOnInit(): void {
    super.ngOnInit();

    // We also want to clear our editing data and refresh when packs are
    // modified, deleted or added.
    this.packsChangeSub = this.packsService.change.subscribe(() => {
      this.cachedEditingData = Object.create(null);
      this.refresh();
    });
  }

  ngOnDestroy(): void {
    this.packsChangeSub.unsubscribe();
  }

  /**
   * Downloads an XML file. This updates the record with a new download date.
   *
   * @param record The file to download.
   *
   * @returns A promise that resolves once the download has been launched and
   * the record updated with the new download date.
   */
  download(record: XMLFile): Promise<void> {
    return super.download(record).then(() => {
      // We update the last time it was downloaded. We do not detect whether the
      // download was cancelled. Not sure we *could*, even...
      record.downloaded = new Date();
      return this.files.updateRecord(record)
      // Make sure we don't return anything.
        .then(() => { return; });
    });
  }

  /**
   * Edit an XML file.
   *
   * @params The file to edit.
   *
   * @returns A promise that resolves once launching the editing task is done.
   */
  edit(record: XMLFile): Promise<void> {
    const base = "../kitchen-sink.html?nodemo=1&localstorage=";
    return this.getEditingData(record).getPack().then((pack) => {
      if (pack === undefined) {
        throw new Error(`edit launched on file without a pack associated \
with it manually or automatically`);
      }
      const here = window.location.href;
      const fileUrl = this.files.makeIndexedDBURL(record);
      const packUrl = this.packsService.makeIndexedDBURL(pack);
      const url = `${base}${fileUrl}&pack=${packUrl}&management=${here}`;
      this.goTo(url);
    });
  }

  private goTo(url: string): void {
    window.location.href = url;
  }

  /**
   * @param record The file for which to get editing data.
   *
   * @returns The editing data.
   */
  getEditingData(record: XMLFile): CachedEditingData {
    const key = String(record.id);
    if (!(key in this.cachedEditingData)) {
      this.cachedEditingData[key] = new CachedEditingData(record,
                                                          this.packsService,
                                                          this.parser);
    }

    return this.cachedEditingData[key];
  }

  /**
   * Create a new XML file. This will prompt the user in the GUI for a new
   * name. It will also prevent overwriting old files.
   *
   * @returns A promise that resolves once the operation is done (either because
   * the new file was created or because the operation was cancelled).
   */
  newFile(): Promise<void> {
    return this.confirmService.prompt("Give a name to your new file")
      .then((name) => {
        if (name === "") {
          return;
        }

        return this.files.writeCheck(name, this.confirmService.confirm)
          .then(({ write, record }) => {
            if (!write) {
              return;
            }

            return this.files.makeRecord(name, "")
              .then((newRecord) => {
                if (record !== null) {
                  newRecord.id = record.id;
                }

                return this.files.updateRecord(newRecord)
                // Void the return value.
                  .then(() => { return; });
              });
          });
      });
  }
}
