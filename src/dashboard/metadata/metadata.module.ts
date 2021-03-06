import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { SharedModule } from "../shared.module";

import { MetadataDetailsComponent } from "./metadata-details.component";
import { MetadataRoutingModule } from "./metadata-routing.module";
import { MetadataComponent } from "./metadata.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    MetadataRoutingModule,
    SharedModule,
  ],
  declarations: [
    MetadataComponent,
    MetadataDetailsComponent,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class MetadataModule {}
