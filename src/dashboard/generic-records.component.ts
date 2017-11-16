import { ActivatedRoute, Router } from "@angular/router";
import { Subscription } from "rxjs";

import { ConfirmService } from "./confirm.service";
import { DBService } from "./db.service";
import { ProcessingService } from "./processing.service";
import { RecordCommon } from "./record-common";
import { triggerDownload } from "./util";

export abstract class GenericRecordsComponent<RecordType extends RecordCommon,
RecordService extends DBService<RecordType, number>> {
  records: RecordType[];
  changeSub: Subscription;

  constructor(protected readonly route: ActivatedRoute,
              protected readonly router: Router,
              protected readonly files: RecordService,
              protected readonly processing: ProcessingService,
              protected readonly confirmService: ConfirmService) {}

  ngOnInit(): void {
    this.changeSub = this.files.change.subscribe(() => {
      this.refresh();
    });
    this.refresh();
  }

  ngOnDestroy(): void {
    this.changeSub.unsubscribe();
  }

  protected refresh(): void {
    // tslint:disable-next-line:no-floating-promises
    this.files.getRecords().then((records: RecordType[]) => {
      this.records = records;
    });
  }

  del(record: RecordType): Promise<void> {
    const handleResponse = (result: boolean) => {
      if (!result) {
        return;
      }

      return this.files.deleteRecord(record);
    };

    return this.confirmService.confirm(
      `Do you really want to delete "${record.name}"?`)
      .then(handleResponse);
  }

  /**
   * The promise returned will resolve once the download has *started*.
   */
  download(record: RecordType): Promise<void> {
    return this.files.getDownloadData(record).then((data) => {
      this.triggerDownload(record.name, data);
    });
  }

  protected triggerDownload(name: string, data: string): void {
    triggerDownload(name, data);
  }

  upload(record: RecordType, event: Event): Promise<void> {
    return Promise.resolve().then(() => {
      const target = (event.target as HTMLInputElement);
      const filesToLoad = target.files;
      if (filesToLoad == null) {
        return;
      }

      switch (filesToLoad.length) {
      case 0:
        return;
      case 1:
        this.processing.start(1);
        return this.files.safeLoadFromFile(filesToLoad[0], record).then(() => {
          this.processing.increment();
          this.processing.stop();
          target.value = "";
        });
      default:
        throw new Error("internal error: the upload control cannot " +
                        "be used for multiple files");
      }
    });
  }

  showDetails(record: RecordType, $event?: Event): void {
    if ($event !== undefined) {
      const target = $event.target as Element;
      if (!document.contains(target) || target.closest("td.buttons") !== null) {
        return;
      }
    }

    // tslint:disable-next-line:no-floating-promises
    this.router.navigate([".", record.id], { relativeTo: this.route });
  }

  trackByName(record: RecordType): string {
    return record.name;
  }
}
