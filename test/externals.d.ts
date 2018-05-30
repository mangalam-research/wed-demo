export {};
declare namespace Chai {
  // Fix to chai to allow .to.include(null) and .to.include(undefined). Submit
  // this to DefinitelyTyped.
  export interface Include {
    (value: Object | undefined | null, message?: string): Assertion;
  }
}
