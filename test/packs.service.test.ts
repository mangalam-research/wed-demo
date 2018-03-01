import "chai";
import "chai-as-promised";
import "mocha";

import { first } from "rxjs/operators/first";

chai.config.truncateThreshold = 0;
const expect = chai.expect;

import { db } from "dashboard/store";

import { ChunksService } from "dashboard/chunks.service";
import { Pack } from "dashboard/pack";
import { PacksService } from "dashboard/packs.service";

import { DataProvider } from "./util";

describe("PacksService", () => {
  let chunkService: ChunksService;
  let service: PacksService;
  // tslint:disable-next-line:mocha-no-side-effect-code
  const files: Record<string, Pack> = Object.create(null);
  let schema: string;
  let provider: DataProvider;

  // tslint:disable-next-line:mocha-no-side-effect-code
  const metadata = JSON.stringify({
    generator: "gen1",
    date: "date1",
    version: "ver1",
    namespaces: {
      foo: "foouri",
      bar: "baruri",
    },
  });

  before(async () => {
    chunkService = new ChunksService();
    service = new PacksService(chunkService);
    provider = new DataProvider("/base/test/data/");
    schema = await provider.getText("doc-annotated.js");
  });

  beforeEach(async () => {
    const packsUnserialized = [{
      name: "foo",
      interchangeVersion: 1,
      schema,
      metadata,
      mode: "generic",
      match: {
        method: "top-element",
        localName: "",
        namespaceURI: "",
      },
    }, {
      name: "moo",
      interchangeVersion: 1,
      schema,
      metadata,
      mode: "generic",
      match: {
        method: "top-element",
        localName: "moo",
        namespaceURI: "moouri",
      },
    }];

    for (const packUnserialized of packsUnserialized) {
      const packData = JSON.stringify(packUnserialized);
      const pack = await service.saveNewRecord("foo", packData);
      files[pack.name] = pack;
    }
  });

  afterEach(() => db.delete().then(() => db.open()));

  describe("#makeRecord", () => {
    it("records metadata into a chunk", () =>
       expect(chunkService.getRecordById(files["foo"].metadata!)
              .then((chunk) => chunk!.getData()))
       .to.eventually.equal(metadata));

    it("records schema into a chunk", () =>
       expect(chunkService.getRecordById(files["foo"].schema)
              .then((chunk) => chunk!.getData())).to.eventually.equal(schema));
  });

  describe("#getMatchObservable returns an observable that", () => {
    it("produces undefined if nothing matches", async () => {
      expect(await service.getMatchObservable("moo", "").pipe(first())
             .toPromise()).to.be.undefined;
      expect(await service.getMatchObservable("b", "moouri").pipe(first())
             .toPromise()).to.be.undefined;
    });

    it("matches automatically if there is no explicit match set", async () =>
       expect(await service.
              getMatchObservable("doc",
                                 // tslint:disable-next-line:no-http-string
                                 "http://mangalamresearch.org/ns/mmwp/doc")
              .pipe(first()).toPromise())
       .to.have.property("id").equal(files["foo"].id));

    it("matches automatically if there is an explicit match set", () =>
       expect(service.getMatchObservable("moo", "moouri").pipe(first())
              .toPromise())
       .to.eventually.have.property("id").equal(files["moo"].id));

    it("adjusts when packs are modified", async () => {
      const observable = service.getMatchObservable("moo", "moouri");
      const pack = await observable.pipe(first()).toPromise();
      expect(pack).to.not.be.undefined;
      await service.deleteRecord(pack!);
      const packAgain = await observable.pipe(first()).toPromise();
      expect(packAgain).to.be.undefined;
    });
  });

  describe("#getDownloadData", () => {
    // tslint:disable-next-line:no-any
    const records: any = {
      "all fields": {
        name: "all fields",
        interchangeVersion: 1,
        schema: "aaa",
        metadata,
        mode: "generic",
        match: {
           method: "top-element",
           localName: "foo",
           namespaceURI: "bar",
        },
      },
      minimal: {
        name: "minimal",
        interchangeVersion: 1,
        schema: "aaa",
        metadata: undefined,
        mode: "generic",
        match: {
           method: "top-element",
           localName: "",
           namespaceURI: "",
        },
      },
    };

    for (const testCase of ["all fields", "minimal"]) {
      describe(`with ${testCase}`, () => {
        // tslint:disable-next-line:no-any
        let record: any;
        let downloadFile: Pack;
        beforeEach(() => {
          record = records[testCase];
          const stringified = JSON.stringify(record);
          return service.makeRecord(record.name, stringified)
            .then((newFile) => downloadFile = newFile)
            .then(() => service.updateRecord(downloadFile));
        });

        it("returns the right data", () =>
           service.getDownloadData(downloadFile)
           .then((data) => JSON.parse(data))
           .then((parsed) => expect(parsed)
                 // We have to stringify and parse again because ``undefined``
                 // is lost in the process. So ``parsed`` won't have any field
                 // with an undefined value.
                 .to.deep.equal(JSON.parse(JSON.stringify(record)))));

        it("round-trips with makeRecord", () =>
           service.getDownloadData(downloadFile)
           .then((data) => service.makeRecord("", data)));
      });
    }
  });
});
