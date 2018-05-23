import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { XMLFileDetailsComponent } from "./xml-file-details.component";
import { XMLFilesComponent } from "./xml-files.component";

const routes: Routes = [
  { path: "",  component: XMLFilesComponent },
  { path: ":id",  component: XMLFileDetailsComponent },
  { path: "new",  component: XMLFileDetailsComponent },
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
export class XMLFilesRoutingModule {}
