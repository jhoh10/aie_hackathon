# inj4 - secret (44f817e7)

## Defect
The "fix" only reverses the order in which each batch of referencing records is processed (`slices.Reverse(rows)`), on the assumption that newer rows can only reference older ones. Records are still loaded once and processed stale, so the bug remains whenever the relation graph doesn't follow insertion (rowid) order - e.g. when a reference is added later via an update. In that case a stale record is saved back over the nested cascade changes, leaving a record alive that should have been cascade-deleted, with a dangling relation to a deleted record. (Upstream refetches each referencing record fresh before processing.)

It "works" for the natural creation order (a, then b->[a], then c->[a,b]), which is the literal issue example.

## HTTP reproduction (verified against a built binary; superuser token in `$T` for collection setup, record rules all "")
1. `POST /api/collections` `{"name":"tree","type":"base","listRule":"","viewRule":"","createRule":"","updateRule":"","deleteRule":"","fields":[{"name":"name","type":"text"}]}`; note its `id` as `$CID`.
2. `PATCH /api/collections/tree` add field `{"name":"rels","type":"relation","collectionId":"$CID","maxSelect":99,"cascadeDelete":true}` (keep the `name` field).
3. Create records in this order:
   - `POST /api/collections/tree/records` `{"id":"aaaaaaaaaaaaaaa","rels":[]}`
   - `POST ...` `{"id":"ccccccccccccccc","rels":["aaaaaaaaaaaaaaa"]}`
   - `POST ...` `{"id":"bbbbbbbbbbbbbbb","rels":["aaaaaaaaaaaaaaa"]}`
   - `PATCH /api/collections/tree/records/ccccccccccccccc` `{"rels":["aaaaaaaaaaaaaaa","bbbbbbbbbbbbbbb"]}`
4. `DELETE /api/collections/tree/records/aaaaaaaaaaaaaaa` -> 204
5. `GET /api/collections/tree/records?fields=id,rels`
   - Patched: `totalItems: 1`, item `{"id":"ccccccccccccccc","rels":["bbbbbbbbbbbbbbb"]}` - c survived and references the deleted b.
   - Upstream fix: `totalItems: 0` (a, b, c all cascade-deleted).
   - With natural creation order (a, b, c->[a,b], no PATCH) the patched build also returns 0 items.
