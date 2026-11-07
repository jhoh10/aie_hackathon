# inj1 - secret (f8687567)

## Defect
The settings-level fix (max vs min, no longer skipping `max: 0`) is correct, but the patch also removes the `val == 0` early return in `NumberField.ValidateValue`. In PocketBase `0` is the "blank" value of a number field, so a **non-required** number field with `min > 0` (or `max < 0`) now rejects records that leave the field empty (or send 0). This breaks every optional bounded number field - an adjacent-behaviour regression.

## HTTP reproduction (verified against built binaries; superuser token in `$T`)
1. `POST /api/collections` `{"name":"n1","type":"base","createRule":"","listRule":"","fields":[{"name":"score","type":"number","min":5},{"name":"title","type":"text"}]}` -> 200
2. `POST /api/collections/n1/records` `{"title":"x"}` (score omitted)
   - Patched: **400** (`score: validation_min_number_constraint`)
   - Upstream fix f8687567 and parent: 200
3. `POST /api/collections/n1/records` `{"title":"x","score":0}` -> patched 400, upstream 200.
4. Control: `{"score":3}` -> 400 on both; `{"score":7}` -> 200 on both; collection with `min:5,max:0` -> 400 on both (the issue itself is fixed).

## Build note
The parent commit uses `encoding/json` v1 and its pristine tests/server crash with a stack overflow (`Collection.UnmarshalJSON` recursion) under plain golang:1.27. Built and tested with `golang:1.27-alpine` and `GOEXPERIMENT=nojsonv2`.
