declare namespace Chai {
  // Fix to chai to allow .to.include(null) and .to.include(undefined). Submit
  // this to DefinitelyTyped.
  export interface Include {
    (value: Object | undefined | null, message?: string): Assertion;
  }
}

declare module "bluejax" {
  export type AjaxCall = (...params: any[]) => Promise<any>;
  export type $AjaxCall = (...params: any[]) => {
    promise: Promise<any>;
    xhr: JQueryXHR;
  };

  export function ajax(...params: any[]): Promise<any>;
  export function make(options: any): $AjaxCall;
  export function make(options: any, field: "promise"): AjaxCall;
}
