import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { PackDetailsComponent } from "./pack-details.component";
import { PacksComponent } from "./packs.component";

const routes: Routes = [
  { path: "",  component: PacksComponent },
  { path: ":id",  component: PackDetailsComponent },
  { path: "new",  component: PackDetailsComponent },
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
export class PacksRoutingModule { }
