#!/usr/bin/env bash

set -eu

while true; do inotifywait -e close_write  entries/*.md; ./build.sh; done
