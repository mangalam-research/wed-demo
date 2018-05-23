import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { SharedModule } from "../shared.module";
import { ControlRoutingModule } from "./control-routing.module";
import { ControlComponent } from "./control.component";

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ControlRoutingModule,
    SharedModule,
  ],
  declarations: [
    ControlComponent,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class ControlModule { }
