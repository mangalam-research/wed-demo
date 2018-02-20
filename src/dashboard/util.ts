/**
 * @desc Utilities
 * @author Louis-Dominique Dubeau
 * @license MPL 2.0
 * @copyright Mangalam Research Center for Buddhist Languages
 */

import { FormGroup, NgForm } from "@angular/forms";
import * as bootbox from "bootbox";

import { readFile } from "./store-util";

// The default behavior for bootbox.confirm is to make the default button be the
// one that says "yes".
export function safeConfirm(message: string): Promise<boolean> {
  return new Promise((resolve) => { // tslint:disable-line:promise-must-complete
    bootbox.confirm({
      message,
      buttons: {
        cancel: {
          label: "No",
          className: "btn-default btn-primary pull-left",
        },
        confirm: {
          label: "Yes",
          className: "btn-danger pull-right",
        },
      },
      callback: resolve,
    });
  });
}

export function triggerDownload(name: string, mimeType: string,
                                data: string): void {
  const file = new window.Blob([data], { type: mimeType });
  // tslint:disable-next-line:strict-boolean-expressions no-any
  const URL = (window as any).webkitURL || window.URL;
  const downloadUrl = URL.createObjectURL(file);

  // We need this for IE 10, 11. For lesser versions of IE we'll fall into
  // the other branch that won't work but we don't support those old
  // browsers anyway.
  if (window.navigator.msSaveBlob !== undefined) {
    window.navigator.msSaveBlob(file, name);
  }
  else {
    // This rigmarole allows the download button to **download** rather than
    // open the link in a new window.
    const a: HTMLAnchorElement = document.createElement("a");
    a.href = downloadUrl;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Checks if the contents of two files are equal. File names are ignored.
 *
 * @param a File to compare.
 *
 * @param b File to compare.
 *
 * @returns Whether they are equal.
 */
export function filesEqual(a: File, b: File): Promise<boolean> {
  return Promise.resolve()
    .then(() => {
      if (a.size !== b.size) {
        return false;
      }

      return Promise.all([readFile(a), readFile(b)])
        .then(([contentA, contentB]) => contentA === contentB);
    });
}

export type FormErrors = {[name: string]: string };
export type ValidationMessages = {[name: string]: {[name: string]: string}};

export function updateFormErrors(ngForm: NgForm | FormGroup,
                                 formErrors: FormErrors,
                                 validationMessages: ValidationMessages): void {
  const form = ngForm instanceof FormGroup ? ngForm : ngForm.form;

  for (const fieldName of Object.keys(form.controls)) {
    // Clear previous errors.
    formErrors[fieldName] = "";

    const control = form.controls[fieldName];
    if (control != null && !control.disabled && control.dirty &&
        control.invalid) {
      const messages = validationMessages[fieldName];
      const errors = control.errors;

      if (errors === null) {
        throw new Error(`control is invalid but has no errors: ${fieldName}`);
      }

      // tslint:disable-next-line:forin
      for (const key in errors) {
        formErrors[fieldName] += `${messages[key]} `;
      }
    }
  }
}

/**
 * This is required to work around a problem when extending built-in classes
 * like ``Error``. Some of the constructors for these classes return a value
 * from the constructor, which is then picked up by the constructors generated
 * by TypeScript (same with ES6 code transpiled through Babel), and this messes
 * up the inheritance chain.
 *
 * See https://github.com/Microsoft/TypeScript/issues/12123.
 */
// tslint:disable:ban-types no-any
export function fixPrototype(obj: any, parent: Function): void {
  const oldProto: Function = Object.getPrototypeOf !== undefined ?
    Object.getPrototypeOf(obj) : (obj as any).__proto__;

  if (oldProto !== parent) {
    if (Object.setPrototypeOf !== undefined) {
      Object.setPrototypeOf(obj, parent.prototype);
    }
    else {
      (obj as any).__proto__ = parent.prototype;
    }
  }
}
// tslint:enable:ban-types no-any
