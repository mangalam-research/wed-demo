import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

import { ControlComponent } from "./control.component";

const routes: Routes = [
  { path: "",  component: ControlComponent },
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
export class ControlRoutingModule { }
