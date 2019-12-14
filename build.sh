#!/usr/bin/env bash

set -eu

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cp -r ../resources/* .

pandoc -s ../entries/index.md -o index.html --css pandoc.css

cd entries
make
