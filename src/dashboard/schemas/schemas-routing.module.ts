import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { SchemaDetailsComponent } from "./schema-details.component";
import { SchemasComponent } from "./schemas.component";

const routes: Routes = [
  { path: "",  component: SchemasComponent },
  { path: ":id",  component: SchemaDetailsComponent },
  { path: "new",  component: SchemaDetailsComponent },
];

// tslint:disable-next-line:no-stateless-class
@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [
    RouterModule,
  ],
})
export class SchemasRoutingModule { }
