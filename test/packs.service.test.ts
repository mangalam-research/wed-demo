import "chai";
import "chai-as-promised";
import "mocha";

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

  after(() => db.delete().then(() => db.open()));

  describe("#makeRecord", () => {
    it("records metadata into a chunk", () =>
       expect(chunkService.getRecordById(files["foo"].metadata!)
              .then((chunk) => chunk!.getData()))
       .to.eventually.equal(metadata));

    it("records schema into a chunk", () =>
       expect(chunkService.getRecordById(files["foo"].schema)
              .then((chunk) => chunk!.getData())).to.eventually.equal(schema));
  });

  describe("#matchWithPack", () => {
    it("returns undefined if nothing matches", async () => {
      expect(await service.matchWithPack("moo", "")).to.be.undefined;
      expect(await service.matchWithPack("b", "moouri")).to.be.undefined;
    });

    it("matches automatically if there is no explicit match set", () =>
       expect(service.matchWithPack("doc",
                                    // tslint:disable-next-line:no-http-string
                                    "http://mangalamresearch.org/ns/mmwp/doc"))
       .to.eventually.have.property("id").equal(files["foo"].id));

    it("matches automatically if there is an explicit match set", () =>
       expect(service.matchWithPack("moo", "moouri"))
       .to.eventually.have.property("id").equal(files["moo"].id));
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
        before(() => {
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
