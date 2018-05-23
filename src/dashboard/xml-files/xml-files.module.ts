import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { SharedModule } from "../shared.module";

import { XMLFileDetailsComponent } from "./xml-file-details.component";
import { XMLFilesRoutingModule } from "./xml-files-routing.module";
import { XMLFilesComponent } from "./xml-files.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    XMLFilesRoutingModule,
    SharedModule,
  ],
  declarations: [
    XMLFilesComponent,
    XMLFileDetailsComponent,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class XMLFilesModule {}
