#!/usr/bin/env bash

set -eu

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
cd entries
make

cd ..

cp -r resources/* public

pandoc -s ../entries/index.md -o index.html --css pandoc.css

