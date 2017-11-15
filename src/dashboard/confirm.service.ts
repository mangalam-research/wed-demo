import { Inject, Injectable, Optional } from "@angular/core";
import * as bootbox from "bootbox";

import { safeConfirm } from "./util";

export type Confirmer = (message: string) => Promise<boolean>;
export type Prompter = (message: string) => Promise<string>;
export type Alerter = (message: string) => Promise<void>;

export function bootboxPrompter(message: string): Promise<string> {
  return new Promise((resolve) => {
    bootbox.prompt(message, resolve);
  });
}

export function bootboxAlerter(message: string): Promise<void> {
  return new Promise<void>((resolve) => {
    bootbox.alert(message, resolve);
  });
}

// This next annotation is necessary to prevent ngc from freaking out when
// emitting metadata due to the ``Confirmer``, ``Prompter`` and ``Alerter``
// types below.
//
// See: https://github.com/angular/angular/issues/20351#issuecomment-344009887
//
/** @dynamic */
@Injectable()
export class ConfirmService {
  private readonly confirmer: Confirmer = safeConfirm;
  private readonly prompter: Prompter = bootboxPrompter;
  private readonly alerter: Alerter = bootboxAlerter;

  constructor(@Optional() @Inject("Confirmer") confirmer: Confirmer | undefined,
              @Optional() @Inject("Prompter") prompter: Prompter | undefined,
              @Optional() @Inject("Alerter") alerter: Alerter | undefined) {
    // We cannot use TypeScript's support for default parameter values because
    // @Optional passes ``null`` if no value has been specified, but
    // TypeScript's generated code only checks for ``undefined`` when deciding
    // to check whether to use the default value. (IOW, an argument of ``null``
    // means: don't use the default value.) Sigh...
    if (confirmer != null) {
      this.confirmer = confirmer;
    }
    if (prompter != null) {
      this.prompter = prompter;
    }
    if (alerter != null) {
      this.alerter = alerter;
    }
  }

  confirm(message: string): Promise<boolean> {
    return this.confirmer(message);
  }

  prompt(message: string): Promise<string> {
    return this.prompter(message);
  }

  alert(message: string): Promise<void> {
    return this.alerter(message);
  }
}
