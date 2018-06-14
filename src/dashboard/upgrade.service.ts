import { Injectable } from "@angular/core";
import { Dexie } from "dexie";

import { ConfirmService } from "./confirm.service";
import { Pack } from "./pack";
import { db } from "./store";
import { triggerDownload } from "./util";

export class Upgrade {
  private readonly obsoletePacks: Dexie.Collection<Pack, number>;

  constructor() {
    this.obsoletePacks = db.packs.where("recordVersion").below(2);
  }

  /**
   * @returns Whether this upgrade will modify the database.
   */
  willModifyDatabase(): Promise<boolean> {
    return this.obsoletePacks.count().then((x) =>  x > 0);
  }

  /**
   * Apply the upgrade.
   */
  apply(): Promise<void> {
    return this.willModifyDatabase()
      .then((go) => {
        if (!go) {
          return;
        }

        // What we do here is edit the files that use the packs so that they no
        // longer use the packs. We need a transaction, otherwise we get an
        // error due to the "outer" operation being a read but the "inner" one
        // being a write.
        return db.transaction("rw", db.packs, db.xmlfiles, () => {
          const updates: Promise<{}>[] = [];
          return this.obsoletePacks.primaryKeys()
            .then((keys) => db.xmlfiles.where("pack").anyOf(keys)
                  .each((xmlfile) => {
                    xmlfile.pack = undefined;
                    updates.push(db.xmlfiles.put(xmlfile));
                  }))
            .then(() => Dexie.Promise.all(updates))
            .then(() => this.obsoletePacks.delete());
        }).then(() => undefined);
      });
  }
}

/**
 * A service that is used to perform database upgrades. The upgrades performed
 * here require informing the user, or performing backups, or some other type of
 * user intervention.
 */
@Injectable()
export class UpgradeService {

  constructor(private confirmService: ConfirmService) {}

  upgrade(): Promise<void> {
    const upgrade = new Upgrade();
    return upgrade.willModifyDatabase()
      .then((modify) => {
        if (!modify) {
          return;
        }

        return Promise.all([
          this.confirmService.alert(`The database must be upgraded. \
A backup of the database will be downloaded automatically by your browser \
in a few seconds. SAVE THE FILE. Once you have saved it, click the button to \
close this dialog box.`),
          this.download()])
          .then(() => upgrade.apply())
          .then(() => this.confirmService.alert(`We will now reload the \
application.`))
          .then(() => {
            this.reload();
          });
      })
      .catch(() => this.confirmService.alert(`The upgrade failed! Please \
file a bug report.`));
  }

  download(): Promise<void> {
    return db.dump().then((dump) => {
      this.triggerDownload("backup", dump);
    });
  }

  triggerDownload(name: string, data: string): void {
    triggerDownload(name, "application/json", data);
  }

  reload(): void {
    window.location.reload();
  }
}
