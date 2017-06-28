import { Component, OnInit } from "@angular/core";

import { UpgradeService } from "./upgrade.service";

@Component({
  moduleId: module.id,
  selector: "dashboard-app",
  templateUrl: "./app.component.html",
})
export class AppComponent implements OnInit {
  title: string = "Dashboard";

  constructor(private readonly upgradeService: UpgradeService) {}

  ngOnInit(): void {
    // tslint:disable-next-line:no-floating-promises
    this.upgradeService.upgrade();
  }
}
