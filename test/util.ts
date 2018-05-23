import { ajax } from "bluejax";
import "chai";

const expect = chai.expect;

export function waitFor(fn: () => boolean | Promise<boolean>,
                        delay: number = 100,
                        timeout?: number):
Promise<boolean> {
  const start = Date.now();

  function check(): boolean | Promise<boolean> {
    const ret = fn();
    if (ret) {
      return ret;
    }

    if ((timeout !== undefined) && (Date.now() - start > timeout)) {
      return false;
    }

    return new Promise((resolve) => setTimeout(resolve, delay)).then(check);
  }

  return Promise.resolve().then(check);
}

export function waitForSuccess(fn: () => void,
                               delay?: number,
                               timeout?: number):
Promise<void> {
  return waitFor(() => {
    try {
      fn();
      return true;
    }
    catch (e) {
      if (e instanceof chai.AssertionError) {
        return false;
      }

      throw e;
    }
    // tslint:disable-next-line:align
  }, delay, timeout).then(() => undefined);
}

export class DataProvider {
  private readonly cache: Record<string, string> = Object.create(null);
  private readonly parser: DOMParser = new DOMParser();

  constructor(private readonly base: string) {}

  getText(path: string): Promise<string> {
    return this._getText(this.base + path);
  }

  _getText(path: string): Promise<string> {
    return Promise.resolve().then(() => {
      const cached = this.cache[path];
      if (cached !== undefined) {
        return cached;
      }

      return ajax({ url: path, dataType: "text"})
        .then((data) => {
          this.cache[path] = data;
          return data;
        });
    });
  }

  getDoc(path: string): Promise<Document> {
    return this._getText(this.base + path).then((data) => {
      return this.parser.parseFromString(data, "text/xml");
    });
  }
}

// tslint:disable-next-line:no-any
export type ErrorClass = { new (...args: any[]): Error };

// tslint:disable-next-line:no-any
export function expectReject(p: Promise<any>,
                             pattern: RegExp | string): Promise<void>;
// tslint:disable-next-line:no-any
export function expectReject(p: Promise<any>, errorClass: ErrorClass,
                             pattern: RegExp | string): Promise<void>;
// tslint:disable-next-line:no-any
export function expectReject(p: Promise<any>,
                             errorLike: RegExp | string | ErrorClass,
                             pattern?: RegExp | string): Promise<void> {
  return p.then(
    () => {
      throw new Error("should have thrown an error");
    },
    // tslint:disable-next-line:no-any
    (ex: any) => {
      if (!(errorLike instanceof RegExp || typeof errorLike === "string")) {
        expect(ex).to.be.instanceof(errorLike);
      }
      else {
        // tslint:disable-next-line:no-parameter-reassignment
        pattern = errorLike;
      }

      if (pattern instanceof RegExp) {
        expect(ex).to.have.property("message").match(pattern);
      }
      else {
        expect(ex).to.have.property("message").equal(pattern);
      }
    });
}
