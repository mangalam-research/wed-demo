import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { SharedModule } from "../shared.module";

import { PackDetailsComponent } from "./pack-details.component";
import { PacksRoutingModule } from "./packs-routing.module";
import { PacksComponent } from "./packs.component";

//tslint:disable-next-line:no-stateless-class
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    PacksRoutingModule,
    SharedModule,
  ],
  declarations: [
    PackDetailsComponent,
    PacksComponent,
  ],
})
export class PacksModule { }
