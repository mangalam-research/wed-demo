import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { MetadataDetailsComponent } from "./metadata-details.component";
import { MetadataComponent } from "./metadata.component";

const routes: Routes = [
  { path: "",  component: MetadataComponent },
  { path: ":id",  component: MetadataDetailsComponent },
  { path: "new",  component: MetadataDetailsComponent },
];

@NgModule({
  imports: [
    RouterModule.forChild(routes),
  ],
  exports: [
    RouterModule,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class MetadataRoutingModule {}
