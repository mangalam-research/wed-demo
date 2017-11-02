import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { BrowserModule } from "@angular/platform-browser";

import { AppRoutingModule } from "./app-routing.module";
import { AppComponent } from "./app.component";
import { ChunksService } from "./chunks.service";
import { ConfirmService } from "./confirm.service";
import { MetadataService } from "./metadata.service";
import { ModesService } from "./modes.service";
import { PacksService } from "./packs.service";
import { ProcessingComponent } from "./processing.component";
import { ProcessingService } from "./processing.service";
import { SchemasService } from "./schemas.service";
import { SharedModule } from "./shared.module";
import { UpgradeService } from "./upgrade.service";
import { XMLFilesService } from "./xml-files.service";

export const configuration: NgModule = {
  imports: [
    BrowserModule,
    FormsModule,
    SharedModule,
    AppRoutingModule,
  ],
  declarations: [
    AppComponent,
    ProcessingComponent,
  ],
  providers: [
    ConfirmService,
    ChunksService,
    XMLFilesService,
    ProcessingService,
    ModesService,
    SchemasService,
    MetadataService,
    UpgradeService,
    PacksService,
  ],
  bootstrap: [ AppComponent ],
};

//tslint:disable-next-line:no-stateless-class
@NgModule(configuration)
export class AppModule {}
