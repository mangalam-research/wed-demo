import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { SharedModule } from "../shared.module";

import { SchemaDetailsComponent } from "./schema-details.component";
import { SchemasRoutingModule } from "./schemas-routing.module";
import { SchemasComponent } from "./schemas.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    SchemasRoutingModule,
    SharedModule,
  ],
  declarations: [
    SchemasComponent,
    SchemaDetailsComponent,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class SchemasModule {}
