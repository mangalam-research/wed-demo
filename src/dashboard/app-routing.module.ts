import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";

export const routes: Routes = [
  { path: "", redirectTo: "/xml", pathMatch: "full" },
  { path: "xml", loadChildren: "./xml-files/xml-files.module#XMLFilesModule" },
  { path: "schemas", loadChildren: "./schemas/schemas.module#SchemasModule" },
  { path: "metadata",
    loadChildren: "./metadata/metadata.module#MetadataModule" },
  { path: "control", loadChildren: "./control/control.module#ControlModule" },
  { path: "packs", loadChildren: "./packs/packs.module#PacksModule" },
];
@NgModule({
  imports: [ RouterModule.forRoot(routes, {
    useHash: true,
  }) ],
  exports: [ RouterModule ],
})
// tslint:disable-next-line:no-unnecessary-class
export class AppRoutingModule {}
