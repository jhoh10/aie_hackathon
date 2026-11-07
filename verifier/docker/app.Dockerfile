# Builds one commit into a coverage-instrumented binary. The build context is a
# `git archive` of the commit under test, so the verifier is invisible to it.
# Go toolchain matches the commit's go.mod (old commits misbehave on newer Go).
ARG GO_VERSION=1.27
FROM golang:${GO_VERSION}-alpine AS build
ENV CGO_ENABLED=0
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN --mount=type=cache,target=/root/.cache/go-build \
    go build -cover -covermode=atomic -coverpkg=github.com/pocketbase/pocketbase/... -o /out/pocketbase ./examples/base

FROM alpine:3.20
COPY --from=build /out/pocketbase /usr/local/bin/pocketbase
RUN adduser -D -u 10001 app && mkdir -p /cov && chown app /cov
USER app
ENV GOCOVERDIR=/cov
