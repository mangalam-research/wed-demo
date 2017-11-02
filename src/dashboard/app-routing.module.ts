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
//tslint:disable-next-line:no-stateless-class
@NgModule({
  imports: [ RouterModule.forRoot(routes, {
    useHash: true,
  }) ],
  exports: [ RouterModule ],
})
export class AppRoutingModule {}
