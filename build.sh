#!/usr/bin/env bash

set -eu

parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )

cd "$parent_path/public"

cp -r ../resources/* .

mkdir -p posts
pandoc -s ../entries/Shaking-up-the-IDE.md -o posts/Shaking-up-the-IDE.html --css ../pandoc.css

pandoc -s ../entries/index.md -o index.html --css pandoc.css
