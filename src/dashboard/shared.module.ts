/**
 */
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { ClearStoreComponent } from "./clear-store.component";
import { UploadComponent } from "./upload.component";

@NgModule({
  imports: [
    CommonModule,
  ],
  declarations: [
    ClearStoreComponent,
    UploadComponent,
  ],
  exports: [
    ClearStoreComponent,
    UploadComponent,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class SharedModule {}
