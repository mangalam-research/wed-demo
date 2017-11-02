/**
 */
import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";

import { ClearStoreComponent } from "./clear-store.component";
import { UploadComponent } from "./upload.component";

//tslint:disable-next-line:no-stateless-class
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
export class SharedModule { }
