import { CommonModule } from "@angular/common";
import { NgModule } from "@angular/core";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../shared.module";

import { PackDetailsComponent } from "./pack-details.component";
import { PacksRoutingModule } from "./packs-routing.module";
import { PacksComponent } from "./packs.component";

@NgModule({
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    PacksRoutingModule,
    SharedModule,
  ],
  declarations: [
    PackDetailsComponent,
    PacksComponent,
  ],
})
// tslint:disable-next-line:no-unnecessary-class
export class PacksModule {}
