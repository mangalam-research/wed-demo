export type AjaxCall = (...params: any[]) => Promise<any>;
export type $AjaxCall = (...params: any[]) => {
  promise: Promise<any>;
  xhr: JQueryXHR;
};

export function ajax(...params: any[]): Promise<any>;
export function make(options: any): $AjaxCall;
export function make(options: any, field: "promise"): AjaxCall;
