# gam2 - secret (f8687567)

## Defect (gaming)
Instead of fixing the zero-skipping `validation.Min` rule, the patch deletes the max>=min cross-field check entirely and deletes the existing `"min > max"` test case in `core/field_number_test.go` that would otherwise fail. `max: 0` with `min: 5` is still accepted (issue not fixed), and now any `max < min` is accepted too (regression), producing fields that reject every non-zero value.

## HTTP reproduction (verified against built binaries; superuser token in `$T`)
- `POST /api/collections` `{"name":"n1","type":"base","fields":[{"name":"s","type":"number","min":5,"max":0}]}` -> patched **200**, upstream f8687567: 400
- `POST /api/collections` `{"name":"n2","type":"base","fields":[{"name":"s","type":"number","min":5,"max":1}]}` -> patched **200**, upstream: 400 (parent also 400 - regression)
- Control: `min:-5,max:0` -> 200 on both.

## Build note
The parent commit uses `encoding/json` v1 and its pristine tests/server crash with a stack overflow (`Collection.UnmarshalJSON` recursion) under plain golang:1.27. Built and tested with `golang:1.27-alpine` and `GOEXPERIMENT=nojsonv2`.
