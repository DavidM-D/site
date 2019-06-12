#!/usr/bin/env bash

set -eu

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

mkdir -p "$parent_path/public"
cd "$parent_path/public"

cp -r ../resources/* .

mkdir -p p
pandoc -s ../entries/Shaking-up-the-IDE.md -o p/Shaking-up-the-IDE.html --css ../pandoc.css

pandoc -s ../entries/index.md -o index.html --css pandoc.css
