#!/bin/sh
cd "$(dirname "$0")/../.." && exec node tests/v96/run.mjs "$@"
